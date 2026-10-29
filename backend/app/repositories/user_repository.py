from typing import Any

import psycopg


class UserRepository:
    """Database access for the users table."""

    def __init__(self, conn: psycopg.Connection):
        # Use the caller's connection so that multiple
        # repositories can share the same transaction
        self.conn = conn

    def list_all(self) -> list[dict[str, Any]]:
        """List all users, sorted by user_id."""
        return self.conn.execute(
            "SELECT user_id, name FROM users ORDER BY user_id"
        ).fetchall()
