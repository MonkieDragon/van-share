-- Per-operator hidden journeys (excluded from browse and open jobs).

CREATE TABLE IF NOT EXISTS operator_hidden_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators (id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_hidden_journeys_uniq UNIQUE (operator_id, journey_id)
);

CREATE INDEX IF NOT EXISTS operator_hidden_journeys_operator_id_idx
  ON operator_hidden_journeys (operator_id);
