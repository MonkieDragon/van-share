-- Listing lifecycle (draft vs published), fixed vs flexible stops, host/applicant auth links.
-- total_passenger_count = host_passenger_count + sum(confirmed joiners only).

ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS listing_status text NOT NULL DEFAULT 'submitted'
    CHECK (listing_status IN ('draft', 'submitted')),
  ADD COLUMN IF NOT EXISTS stop_mode text NOT NULL DEFAULT 'fixed'
    CHECK (stop_mode IN ('fixed', 'flexible')),
  ADD COLUMN IF NOT EXISTS host_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE journey_participants
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS journeys_route_date_listing_idx
  ON journeys (route_id, departure_date, listing_status);

CREATE INDEX IF NOT EXISTS journeys_host_user_id_idx ON journeys (host_user_id);

COMMENT ON COLUMN journeys.total_passenger_count IS
  'Confirmed seats only: host_passenger_count plus confirmed joiners (pending requests excluded).';

-- Drafts hidden from anonymous browsing; hosts can read their own drafts when authenticated.
DROP POLICY IF EXISTS journeys_select_anon ON journeys;
CREATE POLICY journeys_select_anon ON journeys FOR SELECT TO anon
  USING (listing_status = 'submitted');

DROP POLICY IF EXISTS journeys_select_auth ON journeys;
CREATE POLICY journeys_select_auth ON journeys FOR SELECT TO authenticated
  USING (
    listing_status = 'submitted'
    OR (host_user_id IS NOT NULL AND host_user_id = (SELECT auth.uid()))
  );

-- Recompute confirmed totals (legacy rows used confirmed participants only)
UPDATE journeys j
SET total_passenger_count = j.host_passenger_count + COALESCE(
  (
    SELECT SUM(p.passenger_count)::integer
    FROM journey_participants p
    WHERE p.journey_id = j.id
      AND p.status = 'confirmed'
  ),
  0
);
