import logging

from flask import Flask
from flask_cors import CORS

from app.api import register_blueprints
from app.core import config


def create_app() -> Flask:
    """Create and configure the Flask app."""

    # Show logs at LOG_LEVEL or above, formatted as "time [level] module: message"
    logging.basicConfig(
        level=config.LOG_LEVEL,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Create the Flask app
    app = Flask(__name__)

    # Set the app's JSON format: show Chinese characters and don't sort keys
    app.json.ensure_ascii = False
    app.json.sort_keys = False

    # Enable CORS so the frontend on another origin (e.g. port) can call the API
    CORS(app)

    # Register all API routes (e.g. /users)
    register_blueprints(app)

    return app
