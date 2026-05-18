-- Van booking workflow: parallel passenger matching, interest-based operator flow.

-- journeys: van booking state separate from passenger capacity status
ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS van_booking_status text NOT NULL DEFAULT 'not_booked',
  ADD COLUMN IF NOT EXISTS selected_operator_claim_id uuid;

DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_van_booking_status_chk
    CHECK (van_booking_status IN ('not_booked', 'awaiting_driver', 'booked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend journey lifecycle status (drop old check, add expired)
ALTER TABLE journeys DROP CONSTRAINT IF EXISTS journeys_status_check;
UPDATE journeys
SET status = CASE
  WHEN total_passenger_count >= max_passengers THEN 'full'
  ELSE 'open'
END
WHERE status = 'claimed';

UPDATE journeys
SET van_booking_status = 'booked'
WHERE status IN ('open', 'full', 'cancelled')
  AND EXISTS (
    SELECT 1 FROM operator_claims oc
    WHERE oc.journey_id = journeys.id AND oc.status = 'accepted'
  );

UPDATE journeys j
SET selected_operator_claim_id = oc.id
FROM operator_claims oc
WHERE oc.journey_id = j.id
  AND oc.status = 'accepted'
  AND j.van_booking_status = 'booked';

ALTER TABLE journeys
  ADD CONSTRAINT journeys_status_check
  CHECK (status IN ('open', 'full', 'cancelled', 'expired'));

DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_selected_operator_claim_id_fkey
    FOREIGN KEY (selected_operator_claim_id) REFERENCES operator_claims (id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS journeys_van_booking_status_idx ON journeys (van_booking_status);

-- operator_claims: vehicle FK, interest workflow statuses
ALTER TABLE operator_claims
  ADD COLUMN IF NOT EXISTS operator_vehicle_id uuid REFERENCES operator_vehicles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_unlocked_at timestamptz;

-- Migrate legacy accepted claims to driver_confirmed
UPDATE operator_claims
SET status = 'driver_confirmed',
    contact_unlocked_at = COALESCE(contact_unlocked_at, created_at)
WHERE status = 'accepted';

UPDATE operator_claims
SET status = 'interested'
WHERE status = 'pending';

ALTER TABLE operator_claims DROP CONSTRAINT IF EXISTS operator_claims_status_check;
ALTER TABLE operator_claims
  ADD CONSTRAINT operator_claims_status_check
  CHECK (status IN (
    'interested',
    'selected',
    'not_selected',
    'declined_by_host',
    'driver_confirmed',
    'withdrawn'
  ));

ALTER TABLE operator_claims ALTER COLUMN status SET DEFAULT 'interested';

-- journey_participants: declined applications
ALTER TABLE journey_participants DROP CONSTRAINT IF EXISTS journey_participants_status_check;

ALTER TABLE journey_participants
  ADD CONSTRAINT journey_participants_status_check
  CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled'));

-- RLS: public read of booked / confirmed driver offers on journey pages
DROP POLICY IF EXISTS operator_claims_select_accepted_anon ON operator_claims;
DROP POLICY IF EXISTS operator_claims_select_accepted_auth ON operator_claims;

DROP POLICY IF EXISTS operator_claims_select_public_anon ON operator_claims;
CREATE POLICY operator_claims_select_public_anon
  ON operator_claims FOR SELECT TO anon
  USING (status IN ('driver_confirmed', 'selected'));

DROP POLICY IF EXISTS operator_claims_select_public_auth ON operator_claims;
CREATE POLICY operator_claims_select_public_auth
  ON operator_claims FOR SELECT TO authenticated
  USING (status IN ('driver_confirmed', 'selected'));

DROP POLICY IF EXISTS operators_select_claimed_anon ON operators;
DROP POLICY IF EXISTS operators_select_claimed_auth ON operators;

DROP POLICY IF EXISTS operators_select_booked_anon ON operators;
CREATE POLICY operators_select_booked_anon
  ON operators FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM operator_claims oc
      WHERE oc.operator_id = operators.id
        AND oc.status IN ('driver_confirmed', 'selected')
    )
  );

DROP POLICY IF EXISTS operators_select_booked_auth ON operators;
CREATE POLICY operators_select_booked_auth
  ON operators FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM operator_claims oc
      WHERE oc.operator_id = operators.id
        AND oc.status IN ('driver_confirmed', 'selected')
    )
  );
