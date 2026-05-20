-- Host-declared vehicle at create time + CASCADE deletes for auth-owned rows.

ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS host_has_own_vehicle boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS host_vehicle_type text,
  ADD COLUMN IF NOT EXISTS host_vehicle_seats_offered integer,
  ADD COLUMN IF NOT EXISTS host_vehicle_make text,
  ADD COLUMN IF NOT EXISTS host_vehicle_model text;

DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_host_vehicle_type_chk
    CHECK (
      host_vehicle_type IS NULL
      OR host_vehicle_type IN ('van', 'car', 'suv', 'minibus', 'other')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_host_vehicle_seats_chk
    CHECK (host_vehicle_seats_offered IS NULL OR host_vehicle_seats_offered >= 2);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE journeys DROP CONSTRAINT IF EXISTS journeys_host_user_id_fkey;
ALTER TABLE journeys
  ADD CONSTRAINT journeys_host_user_id_fkey
  FOREIGN KEY (host_user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE operators DROP CONSTRAINT IF EXISTS operators_user_id_fkey;
ALTER TABLE operators
  ADD CONSTRAINT operators_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
