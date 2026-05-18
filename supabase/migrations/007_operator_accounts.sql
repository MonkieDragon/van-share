-- Passenger vs operator accounts, fleet vehicles, reviews out of 10.

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  account_type text NOT NULL DEFAULT 'passenger'
    CHECK (account_type IN ('passenger', 'operator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS operators_user_id_idx ON operators (user_id);

CREATE TABLE IF NOT EXISTS operator_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators (id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL CHECK (year >= 1980 AND year <= 2100),
  license_plate text NOT NULL,
  image_urls text[] NOT NULL DEFAULT '{}',
  seat_count integer CHECK (seat_count IS NULL OR seat_count >= 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_vehicles_image_urls_len_chk
    CHECK (cardinality(image_urls) >= 1 AND cardinality(image_urls) <= 4)
);

CREATE INDEX IF NOT EXISTS operator_vehicles_operator_id_idx ON operator_vehicles (operator_id);

ALTER TABLE operator_reviews
  ADD COLUMN IF NOT EXISTS reviewer_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE operator_reviews DROP CONSTRAINT IF EXISTS operator_reviews_rating_check;
ALTER TABLE operator_reviews ADD CONSTRAINT operator_reviews_rating_check
  CHECK (rating >= 1 AND rating <= 10);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS operator_vehicles_select_public ON operator_vehicles;
CREATE POLICY operator_vehicles_select_public ON operator_vehicles FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM operators o
      WHERE o.id = operator_vehicles.operator_id
        AND o.moderation_status = 'active'
    )
  );

DROP POLICY IF EXISTS operators_select_own ON operators;
CREATE POLICY operators_select_own ON operators FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'operator-vehicle-photos',
  'operator-vehicle-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS operator_vehicle_photos_select_anon ON storage.objects;
CREATE POLICY operator_vehicle_photos_select_anon
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'operator-vehicle-photos');

DROP POLICY IF EXISTS operator_vehicle_photos_select_auth ON storage.objects;
CREATE POLICY operator_vehicle_photos_select_auth
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'operator-vehicle-photos');
