from dataclasses import asdict

from flask import Blueprint, jsonify, request

from app.services.schedule_service import ScheduleService

schedules_bp = Blueprint("schedules", __name__)
schedule_service = ScheduleService()


@schedules_bp.get("/schedules")
def search_schedules():
    """GET /schedules: search train services by date and station range."""
    try:
        schedules = schedule_service.search_schedules(
            travel_date=request.args.get("date"),
            from_station_id=request.args.get("from_station_id"),
            to_station_id=request.args.get("to_station_id"),
            departure_time_from=request.args.get("departure_time_from"),
            departure_time_to=request.args.get("departure_time_to"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify([asdict(schedule) for schedule in schedules])
