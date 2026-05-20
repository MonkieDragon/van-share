-- Create-journey refresh: profile onboarding, transport mode, luggage/pets, remove phone columns.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS host_transport_mode text,
  ADD COLUMN IF NOT EXISTS min_vehicle_seats integer,
  ADD COLUMN IF NOT EXISTS have_pets boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_pets boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cabin_bags_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checked_bags_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS oversized_luggage boolean NOT NULL DEFAULT false;

UPDATE journeys
SET host_transport_mode = CASE
  WHEN host_has_own_vehicle THEN 'own_vehicle'
  WHEN van_booking_status = 'booked' THEN 'vehicle_booked'
  ELSE 'needs_vehicle'
END
WHERE host_transport_mode IS NULL;

UPDATE journeys
SET min_vehicle_seats = max_passengers
WHERE host_transport_mode = 'needs_vehicle' AND min_vehicle_seats IS NULL;

ALTER TABLE journeys
  ALTER COLUMN host_transport_mode SET NOT NULL,
  ALTER COLUMN host_transport_mode SET DEFAULT 'needs_vehicle';

DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_host_transport_mode_chk
    CHECK (host_transport_mode IN ('needs_vehicle', 'own_vehicle', 'vehicle_booked'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_min_vehicle_seats_chk
    CHECK (min_vehicle_seats IS NULL OR min_vehicle_seats >= 2);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE journeys DROP COLUMN IF EXISTS host_phone;
ALTER TABLE journey_participants DROP COLUMN IF EXISTS phone;
ALTER TABLE operators DROP COLUMN IF EXISTS phone;
