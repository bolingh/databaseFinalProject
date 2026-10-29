from typing import Any

import psycopg


class ScheduleRepository:
    """Database access for train schedule searches."""

    def __init__(self, conn: psycopg.Connection):
        self.conn = conn

    def search(
        self,
        travel_date: str,
        from_station_id: str,
        to_station_id: str,
        departure_time_from: str | None,
        departure_time_to: str | None,
    ) -> list[dict[str, Any]]:
        """Find services that stop at both stations in the requested order."""
        return self.conn.execute(
            """
            WITH matching_services AS (
                SELECT
                    origin.train_no,
                    origin.scheduled_time AS departure_time,
                    destination.scheduled_time AS arrival_time
                FROM service_stops AS origin
                JOIN service_stops AS destination
                  ON destination.train_no = origin.train_no
                JOIN service_operating_days AS operating_day
                  ON operating_day.train_no = origin.train_no
                WHERE origin.station_id = %(from_station_id)s
                  AND destination.station_id = %(to_station_id)s
                  AND origin.stop_order < destination.stop_order
                  AND operating_day.weekday =
                      EXTRACT(ISODOW FROM %(travel_date)s::date)
                  AND (
                      %(departure_time_from)s::time IS NULL
                      OR origin.scheduled_time >= %(departure_time_from)s::time
                  )
                  AND (
                      %(departure_time_to)s::time IS NULL
                      OR origin.scheduled_time <= %(departure_time_to)s::time
                  )
            )
            SELECT
                matching.train_no,
                %(travel_date)s::date AS date,
                matching.departure_time::text,
                matching.arrival_time::text,
                GREATEST(
                    COALESCE(capacity.total_seats, 0)
                    - COALESCE(used.booked_seats, 0),
                    0
                ) AS remain_seats
            FROM matching_services AS matching
            JOIN train_services AS service
              ON service.train_no = matching.train_no
            LEFT JOIN train_runs AS run
              ON run.train_no = matching.train_no
             AND run.run_date = %(travel_date)s::date
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::integer AS total_seats
                FROM seat_positions
                WHERE car_no <= service.carriage_count
            ) AS capacity ON TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::integer AS booked_seats
                FROM tickets
                WHERE run_id = run.run_id
            ) AS used ON TRUE
            ORDER BY matching.departure_time, matching.train_no
            """,
            {
                "travel_date": travel_date,
                "from_station_id": from_station_id,
                "to_station_id": to_station_id,
                "departure_time_from": departure_time_from,
                "departure_time_to": departure_time_to,
            },
        ).fetchall()
