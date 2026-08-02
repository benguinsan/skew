# Supabase schema

Canonical SQL for biasly lives in `schema.sql`.

## Apply (greenfield)

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** → New query.
3. Paste the full contents of `schema.sql` and run it.
4. Confirm these tables exist in **Table Editor**:
   - `sources`
   - `articles`
   - `article_analyses` (includes nullable `embedding vector(1536)`)
   - `logs`
   - `oxylabs_schedules`
   - `oxylabs_schedule_runs`
5. Confirm **RLS** is enabled on each table.
6. Confirm the RPC `match_related_articles` exists under **Database → Functions**.

## pgvector (existing projects)

If the base schema was applied before §20, run **`alter-pgvector.sql`** in the SQL Editor (or enable **vector** under **Database → Extensions**, then run that file).

It:

- Enables the `vector` extension in the `extensions` schema
- Adds `article_analyses.embedding extensions.vector(1536)`
- Creates an IVFFlat cosine index
- Creates `match_related_articles` (service_role execute only)

**Dimension note:** Supabase IVFFlat/HNSW indexes support at most **2000** dimensions. This project uses **1536** (`openai/text-embedding-3-small`). Do not use 2048-dim models (e.g. Nemotron embed) without changing the schema and dropping the index (or truncating).

If the column was created as `vector(2048)`, run **`alter-embedding-1536.sql`** to recreate it as 1536 and refresh the RPC. Existing embedding values are cleared — re-run analyze after.

After applying, re-run `POST /api/analyze` so existing analyses get embedding backfill.

## Data API exposure

New projects may not auto-grant table access to the Data API. `schema.sql` includes explicit `GRANT` statements:

- `anon` / `authenticated`: `SELECT` on `sources`, `articles`, `article_analyses` (RLS limits rows)
- `service_role`: full DML on all app tables + `EXECUTE` on `match_related_articles`
- `logs`, `oxylabs_schedules`, `oxylabs_schedule_runs`: service role only (no public grants)

If a query returns `permission denied for table …`, re-run the grant section of `schema.sql` and check **Integrations → Data API** settings.

## Seed sources

Do not invent production source URLs in app code. Use `seed.example.sql` as a template and insert real homepage URLs you control/config in the SQL Editor.

## Env

Copy values from **Project Settings → API** into `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only — never `NEXT_PUBLIC_`)

For embeddings (optional override):

- `OPENROUTER_EMBEDDING_MODEL` — defaults to `openai/text-embedding-3-small` (1536 dims)
