-- Preferred vehicle when host needs transport; seat fields are joiner capacity (not total van size).

ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS preferred_vehicle_type text;

DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_preferred_vehicle_type_chk
    CHECK (
      preferred_vehicle_type IS NULL
      OR preferred_vehicle_type IN ('van', 'car', 'dont_mind')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE journeys DROP CONSTRAINT IF EXISTS journeys_min_vehicle_seats_chk;
DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_min_vehicle_seats_chk
    CHECK (min_vehicle_seats IS NULL OR min_vehicle_seats >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE journeys DROP CONSTRAINT IF EXISTS journeys_host_vehicle_seats_offered_chk;
DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_host_vehicle_seats_offered_chk
    CHECK (host_vehicle_seats_offered IS NULL OR host_vehicle_seats_offered >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
