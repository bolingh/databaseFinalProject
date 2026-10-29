from dataclasses import asdict

from flask import Blueprint, jsonify

from app.services.station_service import StationService

stations_bp = Blueprint("stations", __name__)
station_service = StationService()


@stations_bp.get("/stations")
def list_stations():
    """GET /stations: return all stations in route order."""
    stations = station_service.list_stations()
    return jsonify([asdict(station) for station in stations])