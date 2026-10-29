CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    name    VARCHAR(50) NOT NULL CHECK (btrim(name) <> ''),
    phone   VARCHAR(20)
);

CREATE TABLE stations (
    station_id VARCHAR(20) PRIMARY KEY,
    name       VARCHAR(50) NOT NULL CHECK (btrim(name) <> ''),
    seq        INTEGER NOT NULL UNIQUE CHECK (seq > 0)
);

CREATE TABLE train_services (
    train_no        VARCHAR(20) PRIMARY KEY,
    direction       VARCHAR(10) NOT NULL CHECK (btrim(direction) <> ''),
    carriage_count  INTEGER NOT NULL CHECK (carriage_count > 0)
);

CREATE TABLE service_operating_days (
    train_no VARCHAR(20) NOT NULL REFERENCES train_services(train_no),
    weekday  INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
    PRIMARY KEY (train_no, weekday)
);

CREATE TABLE service_stops (
    train_no       VARCHAR(20) NOT NULL REFERENCES train_services(train_no),
    stop_order     INTEGER NOT NULL CHECK (stop_order > 0),
    station_id     VARCHAR(20) NOT NULL REFERENCES stations(station_id),
    scheduled_time TIME NOT NULL,
    PRIMARY KEY (train_no, stop_order),
    UNIQUE (train_no, station_id)
);

CREATE TABLE train_runs (
    run_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    train_no VARCHAR(20) NOT NULL REFERENCES train_services(train_no),
    run_date DATE NOT NULL,
    UNIQUE (train_no, run_date)
);

CREATE TABLE bookings (
    booking_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id              VARCHAR(20) NOT NULL REFERENCES users(user_id),
    run_id               BIGINT NOT NULL REFERENCES train_runs(run_id),
    origin_station_id    VARCHAR(20) NOT NULL REFERENCES stations(station_id),
    destination_station_id VARCHAR(20) NOT NULL REFERENCES stations(station_id),
    status               VARCHAR(20) NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'cancelled')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at         TIMESTAMPTZ,
    preference           VARCHAR(20),
    adjacent_requested   BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (origin_station_id <> destination_station_id),
    CHECK (preference IS NULL OR lower(preference) IN ('window', 'aisle')),
    CHECK (
        (status = 'cancelled' AND cancelled_at IS NOT NULL)
        OR (status = 'confirmed' AND cancelled_at IS NULL)
    )
);

CREATE TABLE seat_positions (
    car_no      INTEGER NOT NULL CHECK (car_no > 0),
    row_no      INTEGER NOT NULL CHECK (row_no > 0),
    seat_letter CHAR(1) NOT NULL CHECK (seat_letter IN ('A', 'B', 'C', 'D', 'E')),
    category    VARCHAR(20) NOT NULL CHECK (category IN ('window', 'aisle', 'middle')),
    PRIMARY KEY (car_no, row_no, seat_letter)
);

CREATE TABLE tickets (
    ticket_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id  BIGINT NOT NULL REFERENCES bookings(booking_id),
    run_id      BIGINT NOT NULL REFERENCES train_runs(run_id),
    car_no      INTEGER NOT NULL,
    row_no      INTEGER NOT NULL,
    seat_letter CHAR(1) NOT NULL,
    FOREIGN KEY (car_no, row_no, seat_letter)
        REFERENCES seat_positions(car_no, row_no, seat_letter)
);

CREATE INDEX service_stops_station_idx
    ON service_stops (station_id, train_no);

CREATE INDEX train_runs_date_idx
    ON train_runs (run_date, train_no);

CREATE INDEX bookings_user_idx
    ON bookings (user_id, created_at);

CREATE INDEX tickets_booking_idx
    ON tickets (booking_id);

CREATE INDEX bookings_run_segment_idx
    ON bookings (run_id, origin_station_id, destination_station_id);

CREATE INDEX tickets_run_seat_idx
    ON tickets (run_id, car_no, row_no, seat_letter);