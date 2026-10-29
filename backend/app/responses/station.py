from dataclasses import dataclass


@dataclass
class StationResponse:
    """API response definition for a station."""

    station_id: str
    name: str
    seq: int
