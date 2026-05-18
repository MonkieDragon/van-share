# Supabase (van-share)

## Linked project

- `npx supabase migration list --linked` — local vs remote migration versions
- `npx supabase db push --linked --yes` — apply pending `migrations/*.sql` to the hosted DB

## Schema snapshot (no Docker shadow DB)

- `npx supabase db dump --linked -f supabase/.temp/remote_public_schema.sql --schema public` — saves remote DDL under `.temp` (gitignored)

## Schema diff / pull (Docker required)

Uses a local shadow Postgres (pulls images on first run). If port bind fails:

1. `npx supabase stop --project-id van-share`
2. Or change `shadow_port` in `config.toml`

Then:

- `npx supabase db pull <migration_name> --linked --yes` — writes a new migration if remote differs from “all local migrations applied”

**Review every `db pull` migration before committing.** Auto-generated diffs can include harmful statements (e.g. `DROP EXTENSION pg_net`). Prefer `db dump` for inspection when you do not need a new migration file.

## Seed

- `supabase/seed.sql` — runs on `supabase db reset` (local only by default). MVP seed data lives in migration `001`.
