"""Create tables and import CSV data if the database is not initialized."""

import csv
import logging
from datetime import datetime

import psycopg
from psycopg import sql  # safely build SQL containing table and column names

from app.core import config  # path settings such as SCHEMA_FILE and DATA_DIR
from app.core.database import get_connection  # open a database connection

# Logger named "db_init", shown in each log line
logger = logging.getLogger("db_init")

# Tables to import, read in order from data/<table>.csv
# With foreign keys, referenced tables must come first (e.g. users before orders)
TABLES = ["users", "stations"]


def is_initialized(conn: psycopg.Connection) -> bool:
    """Check whether the database has already been initialized."""
    # An existing users table means initialization already succeeded;
    # to_regclass() returns NULL when the table does not exist
    row = conn.execute("SELECT to_regclass('users') IS NOT NULL AS ok").fetchone()
    return row["ok"]


def import_csv(conn: psycopg.Connection, table: str) -> None:
    """Import data/<table>.csv into the table with the same name."""
    path = config.DATA_DIR / f"{table}.csv"
    # utf-8-sig strips the BOM that Excel adds at the start of the file
    with path.open(encoding="utf-8-sig", newline="") as f:
        # The first row is the column names, and the rest are data.
        # Trim column names and values, and turn empty values into None (NULL).
        # Skip rows with no values, such as blank lines or ",," left by Excel
        reader = csv.reader(f)
        columns = [name.strip() for name in next(reader)]
        rows = [
            [value.strip() or None for value in row]
            for row in reader
            if any(value.strip() for value in row)
        ]

    # Build: INSERT INTO table (col1, col2, ...) VALUES (%s, %s, ...)
    # sql.Identifier quotes names, preventing SQL injection and keyword clashes
    query = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
        sql.Identifier(table),  # table name
        sql.SQL(", ").join(map(sql.Identifier, columns)),  # list of column names
        sql.SQL(", ").join(sql.Placeholder() * len(columns)),  # one %s per column
    )

    # A cursor runs SQL on the connection. We need one here because
    # executemany() (run the query once per row) only exists on cursors
    with conn.cursor() as cur:
        cur.executemany(query, rows)
    logger.info("import %s: %d rows", path.name, len(rows))


def import_timetable(conn: psycopg.Connection) -> None:
    """Split timetable.csv into services, operating days, stops, and seats."""
    path = config.DATA_DIR / "timetable.csv"
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        if not fieldnames or len(fieldnames) < 5:
            raise ValueError("timetable.csv must contain train fields and station columns")

        required = {"train_no", "direction", "days", "cars"}
        missing = required.difference(fieldnames)
        if missing:
            raise ValueError(
                f"timetable.csv is missing required columns: {', '.join(sorted(missing))}"
            )
        station_ids = [name.strip() for name in fieldnames[4:] if name.strip()]
        if not station_ids:
            raise ValueError("timetable.csv must contain at least one station column")

        services: list[tuple[str, str, int]] = []
        operating_days: list[tuple[str, int]] = []
        stops: list[tuple[str, int, str, str]] = []

        for line_number, row in enumerate(reader, start=2):
            train_no = (row["train_no"] or "").strip()
            direction = (row["direction"] or "").strip()
            days = (row["days"] or "").strip()
            cars_text = (row["cars"] or "").strip()
            if not train_no or not direction or not days or not cars_text:
                raise ValueError(f"timetable.csv line {line_number} has an empty train field")
            if not days.isdigit() or any(day not in "1234567" for day in days):
                raise ValueError(f"invalid operating days on timetable.csv line {line_number}")
            if len(set(days)) != len(days):
                raise ValueError(f"duplicate operating day on timetable.csv line {line_number}")
            try:
                cars = int(cars_text)
            except ValueError as exc:
                raise ValueError(
                    f"invalid carriage count on timetable.csv line {line_number}"
                ) from exc
            if cars <= 0:
                raise ValueError(f"carriage count must be positive on line {line_number}")

            services.append((train_no, direction, cars))
            operating_days.extend((train_no, int(day)) for day in days)
            direction_upper = direction.upper()
            if direction_upper not in {"S", "N"}:
                raise ValueError(
                    f"unsupported direction {direction!r} on timetable.csv line {line_number}"
                )
            for column_order, station_id in enumerate(station_ids, start=1):
                scheduled_time = (row.get(station_id) or "").strip()
                if not scheduled_time:
                    continue
                try:
                    datetime.strptime(scheduled_time, "%H:%M")
                except ValueError as exc:
                    raise ValueError(
                        f"invalid time {scheduled_time!r} on timetable.csv line {line_number}"
                    ) from exc
                stop_order = (
                    column_order
                    if direction_upper == "S"
                    else len(station_ids) - column_order + 1
                )
                stops.append((train_no, stop_order, station_id, scheduled_time))

    max_carriage_count = max(cars for _, _, cars in services)
    seat_positions = [
        (
            car_no,
            row_no,
            seat_letter,
            "window"
            if seat_letter in {"A", "E"}
            else "aisle"
            if seat_letter in {"C", "D"}
            else "middle",
        )
        for car_no in range(1, max_carriage_count + 1)
        for row_no in range(1, 5)
        for seat_letter in "ABCDE"
    ]

    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO train_services (train_no, direction, carriage_count)
            VALUES (%s, %s, %s)
            """,
            services,
        )
        cur.executemany(
            """
            INSERT INTO service_operating_days (train_no, weekday)
            VALUES (%s, %s)
            """,
            operating_days,
        )
        cur.executemany(
            """
            INSERT INTO service_stops
                (train_no, stop_order, station_id, scheduled_time)
            VALUES (%s, %s, %s, %s)
            """,
            stops,
        )
        cur.executemany(
            """
            INSERT INTO seat_positions (car_no, row_no, seat_letter, category)
            VALUES (%s, %s, %s, %s)
            """,
            seat_positions,
        )
    logger.info(
        "import %s: %d services, %d operating days, %d stops, %d seat positions",
        path.name,
        len(services),
        len(operating_days),
        len(stops),
        len(seat_positions),
    )


def main() -> None:
    # Configure log output (same format as in app/__init__.py)
    logging.basicConfig(
        level=config.LOG_LEVEL,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Open a database connection; it is closed automatically when leaving the block
    with get_connection() as conn:
        if is_initialized(conn):
            logger.info("database already initialized, skip")
            return

        # Start a transaction: if any step fails, all changes are rolled back,
        # so we never end up with tables created but data only half imported
        with conn.transaction():
            logger.info("run %s", config.SCHEMA_FILE.name)
            # Run schema.sql to create all tables
            conn.execute(config.SCHEMA_FILE.read_text(encoding="utf-8"))

            # Import simple CSVs before timetable rows that reference them.
            for table in TABLES:
                import_csv(conn, table)
            import_timetable(conn)

    logger.info("database initialized")


# Only call main() when executed directly with `python db_init.py`
if __name__ == "__main__":
    main()
