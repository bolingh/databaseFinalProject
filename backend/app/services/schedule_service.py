from datetime import date, time

from app.core.database import get_connection
from app.repositories.schedule_repository import ScheduleRepository
from app.responses.schedule import ScheduleResponse


class ScheduleService:
    """Business logic for train schedule searches."""

    def search_schedules(
        self,
        travel_date: str | None,
        from_station_id: str | None,
        to_station_id: str | None,
        departure_time_from: str | None,
        departure_time_to: str | None,
    ) -> list[ScheduleResponse]:
        """Validate search parameters and return matching schedules."""
        if not travel_date or not from_station_id or not to_station_id:
            raise ValueError("date, from_station_id, and to_station_id are required")
        if from_station_id == to_station_id:
            raise ValueError("departure and arrival stations must be different")

        try:
            parsed_date = date.fromisoformat(travel_date)
        except ValueError as exc:
            raise ValueError("date must use YYYY-MM-DD format") from exc

        for value, name in (
            (departure_time_from, "departure_time_from"),
            (departure_time_to, "departure_time_to"),
        ):
            if value:
                try:
                    time.fromisoformat(value)
                except ValueError as exc:
                    raise ValueError(f"{name} must use HH:MM format") from exc
        if (
            departure_time_from
            and departure_time_to
            and departure_time_from > departure_time_to
        ):
            raise ValueError("departure_time_from cannot be later than departure_time_to")

        with get_connection() as conn:
            rows = ScheduleRepository(conn).search(
                travel_date,
                from_station_id,
                to_station_id,
                departure_time_from,
                departure_time_to,
            )

        return [
            ScheduleResponse(
                train_no=row["train_no"],
                date=row["date"].isoformat(),
                departure_time=str(row["departure_time"])[:5],
                arrival_time=str(row["arrival_time"])[:5],
                remain_seats=row["remain_seats"],
            )
            for row in rows
        ]
