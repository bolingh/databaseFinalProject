from dataclasses import dataclass


@dataclass
class ScheduleResponse:
    """API response definition for a train schedule."""

    train_no: str
    date: str
    departure_time: str
    arrival_time: str
    remain_seats: int
