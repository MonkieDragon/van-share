-- Journey pricing: per-seat or split-from-total; car estimates on routes.

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS typical_car_price_php integer NOT NULL DEFAULT 3500;

UPDATE routes SET typical_car_price_php = 3500 WHERE typical_car_price_php IS NULL;

ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS price_mode text NOT NULL DEFAULT 'split_total',
  ADD COLUMN IF NOT EXISTS price_per_seat_php integer,
  ADD COLUMN IF NOT EXISTS total_price_php integer;

DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_price_mode_chk
    CHECK (price_mode IN ('per_seat', 'split_total'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_price_per_seat_php_chk
    CHECK (price_per_seat_php IS NULL OR price_per_seat_php >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE journeys
    ADD CONSTRAINT journeys_total_price_php_chk
    CHECK (total_price_php IS NULL OR total_price_php >= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
