import psycopg  # PostgreSQL driver for Python (psycopg 3)
from psycopg.rows import dict_row  # return query results as dicts

from app.core import config


def get_connection() -> psycopg.Connection:
    """Open a new database connection.

    Use it with a `with` statement:

        with get_connection() as conn:
            rows = conn.execute("SELECT user_id, name FROM users").fetchall()
        # The connection is closed here

    `with` closes the connection automatically when the block ends, even if
    an exception is raised, so connections never leak.
    """
    return psycopg.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        dbname=config.DB_NAME,
        user=config.DB_USER,
        password=config.DB_PASSWORD,
        # Autocommit: each SQL statement takes effect immediately;
        # use `with conn.transaction():` when several statements must succeed or fail together
        autocommit=True,
        # Each result row is a dict, so you can write row["name"] instead of row[1]
        row_factory=dict_row,
    )
