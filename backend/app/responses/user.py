from dataclasses import dataclass


# @dataclass marks this class as a data container
@dataclass
class UserResponse:
    """API response definition for a user."""

    user_id: str
    name: str
