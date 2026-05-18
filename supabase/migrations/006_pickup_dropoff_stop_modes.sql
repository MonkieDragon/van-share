ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS pickup_stop_mode text NOT NULL DEFAULT 'fixed'
    CHECK (pickup_stop_mode IN ('fixed', 'flexible')),
  ADD COLUMN IF NOT EXISTS dropoff_stop_mode text NOT NULL DEFAULT 'fixed'
    CHECK (dropoff_stop_mode IN ('fixed', 'flexible'));

UPDATE journeys
SET
  pickup_stop_mode = stop_mode,
  dropoff_stop_mode = stop_mode
WHERE pickup_stop_mode = 'fixed' AND dropoff_stop_mode = 'fixed';
