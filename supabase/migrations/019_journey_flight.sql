ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS flight_number text,
  ADD COLUMN IF NOT EXISTS flight_airline text,
  ADD COLUMN IF NOT EXISTS flight_origin_iata text,
  ADD COLUMN IF NOT EXISTS flight_scheduled_arrival timestamptz;
