-- Restore pg_net if it was dropped by an accidental `db pull` diff migration.
-- Supabase uses this extension; IF NOT EXISTS is safe when already present.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
