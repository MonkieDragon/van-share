-- Host flags when a journey is ready for operators to claim.
ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS operator_ready boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS journeys_operator_ready_idx ON journeys (operator_ready)
  WHERE listing_status = 'submitted' AND status IN ('open', 'full');
