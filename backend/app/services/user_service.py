from app.core.database import get_connection
from app.repositories.user_repository import UserRepository
from app.responses.user import UserResponse


class UserService:
    """Business logic for user features."""

    def list_users(self) -> list[UserResponse]:
        """List all users, sorted by user_id."""
        # `with` closes the connection automatically
        with get_connection() as conn:
            rows = UserRepository(conn).list_all()

        # Convert each row into the API response format
        return [UserResponse(user_id=row["user_id"], name=row["name"]) for row in rows]
