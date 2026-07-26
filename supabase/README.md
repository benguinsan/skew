# Supabase schema

Canonical SQL for biasly lives in `schema.sql`.

## Apply

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** → New query.
3. Paste the full contents of `schema.sql` and run it.
4. Confirm these tables exist in **Table Editor**:
   - `sources`
   - `articles`
   - `article_analyses`
   - `logs`
   - `oxylabs_schedules`
   - `oxylabs_schedule_runs`
5. Confirm **RLS** is enabled on each table.

## Data API exposure

New projects may not auto-grant table access to the Data API. `schema.sql` includes explicit `GRANT` statements:

- `anon` / `authenticated`: `SELECT` on `sources`, `articles`, `article_analyses` (RLS limits rows)
- `service_role`: full DML on all app tables
- `logs`, `oxylabs_schedules`, `oxylabs_schedule_runs`: service role only (no public grants)

If a query returns `permission denied for table …`, re-run the grant section of `schema.sql` and check **Integrations → Data API** settings.

## Seed sources

Do not invent production source URLs in app code. Use `seed.example.sql` as a template and insert real homepage URLs you control/config in the SQL Editor.

## Env

Copy values from **Project Settings → API** into `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only — never `NEXT_PUBLIC_`)

## Out of scope (later)

- `embedding vector(1536)` on `article_analyses` (pgvector) — after AI analysis
- Local Supabase CLI / migration history — Dashboard apply is enough for this pass
