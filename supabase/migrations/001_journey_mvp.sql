-- Van Share journey-first MVP schema
-- `db push` to linked Supabase. Drops prior MVP tables first so legacy experiments
-- (e.g. routes.id as uuid) are replaced — safe when these tables are empty.

DROP TABLE IF EXISTS operator_claims CASCADE;
DROP TABLE IF EXISTS journey_participants CASCADE;
DROP TABLE IF EXISTS journeys CASCADE;
DROP TABLE IF EXISTS operators CASCADE;
DROP TABLE IF EXISTS routes CASCADE;

CREATE TABLE routes (
  id text PRIMARY KEY,
  name text NOT NULL,
  typical_van_price_php integer NOT NULL DEFAULT 7000
);

INSERT INTO routes (id, name, typical_van_price_php) VALUES
  ('el-nido-puerto-princesa', 'El Nido → Puerto Princesa', 7000),
  ('puerto-princesa-el-nido', 'Puerto Princesa → El Nido', 7000);

CREATE TABLE journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id text NOT NULL REFERENCES routes (id),
  departure_date date NOT NULL,
  time_window_start time NOT NULL,
  time_window_end time,
  host_name text NOT NULL,
  host_email text NOT NULL,
  host_phone text NOT NULL,
  pickup_location text NOT NULL,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_location text NOT NULL,
  dropoff_lat double precision,
  dropoff_lng double precision,
  host_passenger_count integer NOT NULL CHECK (host_passenger_count > 0),
  luggage_count integer NOT NULL DEFAULT 0,
  max_passengers integer NOT NULL DEFAULT 10 CHECK (max_passengers >= 2),
  total_passenger_count integer NOT NULL CHECK (total_passenger_count > 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'claimed', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (total_passenger_count <= max_passengers)
);

CREATE INDEX journeys_departure_date_idx ON journeys (departure_date);
CREATE INDEX journeys_status_idx ON journeys (status);

CREATE TABLE journey_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  pickup_location text NOT NULL,
  dropoff_location text NOT NULL,
  passenger_count integer NOT NULL CHECK (passenger_count > 0),
  luggage_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX journey_participants_journey_id_idx ON journey_participants (journey_id);

CREATE TABLE operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO operators (id, company_name, contact_name, phone, email, verified) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Demo Van Co', 'Demo Operator', '+639000000000', 'operator@example.com', false);

CREATE TABLE operator_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators (id) ON DELETE CASCADE,
  journey_id uuid NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
  proposed_price_php integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id, journey_id)
);

CREATE INDEX operator_claims_journey_id_idx ON operator_claims (journey_id);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS routes_select_anon ON routes;
CREATE POLICY routes_select_anon ON routes FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS routes_select_auth ON routes;
CREATE POLICY routes_select_auth ON routes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS journeys_select_anon ON journeys;
CREATE POLICY journeys_select_anon ON journeys FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS journeys_select_auth ON journeys;
CREATE POLICY journeys_select_auth ON journeys FOR SELECT TO authenticated USING (true);
