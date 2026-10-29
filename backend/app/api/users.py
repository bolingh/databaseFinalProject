from dataclasses import asdict

from flask import Blueprint, jsonify

from app.services.user_service import UserService

# Blueprint for user API routes
users_bp = Blueprint("users", __name__)

# Service for user business logic
user_service = UserService()


@users_bp.get("/users")
def list_users():
    """GET /users: return all users as a JSON array."""
    users = user_service.list_users()
    # Convert each UserResponse to a dict, then jsonify builds the JSON response
    return jsonify([asdict(user) for user in users])
