from app.core.database import get_connection
from app.repositories.station_repository import StationRepository
from app.responses.station import StationResponse


class StationService:
    """Business logic for station features."""

    def list_stations(self) -> list[StationResponse]:
        """List all stations in route order."""
        with get_connection() as conn:
            rows = StationRepository(conn).list_all()

        return [
            StationResponse(
                station_id=row["station_id"],
                name=row["name"],
                seq=row["seq"],
            )
            for row in rows
        ]
