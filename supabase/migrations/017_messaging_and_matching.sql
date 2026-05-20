-- Messaging threads + participant contact unlock / agreed seat price.

ALTER TABLE journey_participants
  ADD COLUMN IF NOT EXISTS contact_unlocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS agreed_price_per_seat_php integer;

DO $$ BEGIN
  ALTER TABLE journey_participants
    ADD CONSTRAINT journey_participants_agreed_price_chk
    CHECK (agreed_price_per_seat_php IS NULL OR agreed_price_per_seat_php >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS journey_participants_active_user_uniq
  ON journey_participants (journey_id, user_id)
  WHERE user_id IS NOT NULL AND status IN ('pending', 'confirmed');

CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  kind text NOT NULL,
  host_user_id uuid NOT NULL,
  counterparty_user_id uuid NOT NULL,
  participant_id uuid REFERENCES journey_participants (id) ON DELETE CASCADE,
  operator_claim_id uuid REFERENCES operator_claims (id) ON DELETE CASCADE,
  contact_unlocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_threads_kind_chk CHECK (kind IN ('passenger', 'operator')),
  CONSTRAINT message_threads_kind_fk_chk CHECK (
    (kind = 'passenger' AND participant_id IS NOT NULL AND operator_claim_id IS NULL)
    OR (kind = 'operator' AND operator_claim_id IS NOT NULL AND participant_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS message_threads_participant_uniq
  ON message_threads (participant_id)
  WHERE participant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS message_threads_operator_claim_uniq
  ON message_threads (operator_claim_id)
  WHERE operator_claim_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS message_threads_host_user_idx ON message_threads (host_user_id);
CREATE INDEX IF NOT EXISTS message_threads_counterparty_user_idx ON message_threads (counterparty_user_id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES message_threads (id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_not_empty CHECK (char_length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS messages_thread_created_idx ON messages (thread_id, created_at);
