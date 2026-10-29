from flask import Flask

from app.api.schedules import schedules_bp
from app.api.stations import stations_bp
from app.api.users import users_bp  # Blueprint (a group of routes) for user APIs


def register_blueprints(app: Flask) -> None:
    """Register all API routes on the Flask app.

    A `Blueprint` is a way to organize a group of related routes, usually
    one per feature. For example, users_bp contains all the /users routes.

    Blueprints keep each feature's routes in its own module, which makes
    the code easier to find and change.
    """
    app.register_blueprint(users_bp)
    app.register_blueprint(stations_bp)
    app.register_blueprint(schedules_bp)

    # TODO: register the Blueprint of each new API module here
