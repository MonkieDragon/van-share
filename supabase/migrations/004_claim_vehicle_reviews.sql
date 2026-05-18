-- Per-claim vehicle details, operator reviews, moderation, storage bucket for claim photos.

-- Operators: moderation (claim API rejects suspended)
ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'active'
    CHECK (moderation_status IN ('active', 'warned', 'suspended')),
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderation_updated_at timestamptz;

-- Accepted claims carry the vehicle offered for that trip
ALTER TABLE operator_claims
  ADD COLUMN IF NOT EXISTS vehicle_make text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_seat_count integer,
  ADD COLUMN IF NOT EXISTS vehicle_image_urls text[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  ALTER TABLE operator_claims
    ADD CONSTRAINT operator_claims_vehicle_seat_count_chk
    CHECK (vehicle_seat_count IS NULL OR vehicle_seat_count >= 2);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reviews: one per participant per journey (operator implied by trip)
CREATE TABLE operator_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators (id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES journey_participants (id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  moderation_status text NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journey_id, participant_id)
);

CREATE INDEX operator_reviews_operator_id_idx ON operator_reviews (operator_id);
CREATE INDEX operator_reviews_journey_id_idx ON operator_reviews (journey_id);

ALTER TABLE operator_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operator_reviews_select_visible_anon ON operator_reviews;
CREATE POLICY operator_reviews_select_visible_anon
  ON operator_reviews FOR SELECT TO anon
  USING (moderation_status = 'visible');

DROP POLICY IF EXISTS operator_reviews_select_visible_auth ON operator_reviews;
CREATE POLICY operator_reviews_select_visible_auth
  ON operator_reviews FOR SELECT TO authenticated
  USING (moderation_status = 'visible');

-- Public read of accepted claims (vehicle shown on journey page)
ALTER TABLE operator_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operator_claims_select_accepted_anon ON operator_claims;
CREATE POLICY operator_claims_select_accepted_anon
  ON operator_claims FOR SELECT TO anon
  USING (status = 'accepted');

DROP POLICY IF EXISTS operator_claims_select_accepted_auth ON operator_claims;
CREATE POLICY operator_claims_select_accepted_auth
  ON operator_claims FOR SELECT TO authenticated
  USING (status = 'accepted');

-- Operators visible when they have at least one accepted claim (nested select from journeys)
DROP POLICY IF EXISTS operators_select_claimed_anon ON operators;
CREATE POLICY operators_select_claimed_anon
  ON operators FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM operator_claims oc
      WHERE oc.operator_id = operators.id
        AND oc.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS operators_select_claimed_auth ON operators;
CREATE POLICY operators_select_claimed_auth
  ON operators FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM operator_claims oc
      WHERE oc.operator_id = operators.id
        AND oc.status = 'accepted'
    )
  );

-- Storage: vehicle photos (uploads via service role; public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'claim-vehicle-photos',
  'claim-vehicle-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS claim_vehicle_photos_select_anon ON storage.objects;
CREATE POLICY claim_vehicle_photos_select_anon
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'claim-vehicle-photos');

DROP POLICY IF EXISTS claim_vehicle_photos_select_auth ON storage.objects;
CREATE POLICY claim_vehicle_photos_select_auth
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'claim-vehicle-photos');
