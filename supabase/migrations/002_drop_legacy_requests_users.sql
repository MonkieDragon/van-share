-- Drop legacy prototype tables not used by the journey-first app.
-- Safe when these tables are empty (no data migration).

DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.request_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
