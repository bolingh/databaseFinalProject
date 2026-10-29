from typing import Any

import psycopg


class StationRepository:
    """Database access for the stations table."""

    def __init__(self, conn: psycopg.Connection):
        self.conn = conn

    def list_all(self) -> list[dict[str, Any]]:
        """List all stations in route order."""
        return self.conn.execute(
            "SELECT station_id, name, seq FROM stations ORDER BY seq"
        ).fetchall()
