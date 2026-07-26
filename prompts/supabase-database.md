# Prompt: Supabase database and data access

## Goal

Implement the **Supabase schema and typed data-access layer** for biasly (Skew News): core tables, RLS + explicit Data API grants, server clients (anon + service role), TypeScript types, and query helpers for UI reads and future pipeline writes.

Do **not** implement scraping, AI analysis, Oxylabs Scheduler, cron, or pgvector embeddings in this task. Do **not** replace homepage/details mock UI yet — keep pages on `lib/mock-articles.ts` until the scrape/analyze pipeline fills the DB.

## Skills read

- `.agents/skills/supabase/SKILL.md` — changelog check, Data API grants, RLS, clients, docs-first
- `.agents/skills/supabase-postgres-best-practices` — RLS basics, indexes on FK/filter columns
- `AGENTS.md` sections 5–7 (layers, schema source of truth), 9–10 (dedupe / append-only), 14–15 (API methods / admin secret — out of scope except env docs), 18–20 (scheduler tables exist now; embedding deferred), 21 (env vars, no service role in browser), 22 (checks)
- Supabase docs verified:
  - Changelog: tables no longer auto-exposed to Data API — **explicit `GRANT` required** ([45329](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically))
  - Next.js quickstart + JS client init (createClient patterns)
  - Row Level Security guide

No Clerk / Oxylabs / AI SDK skills for this task (auth already wired; pipeline later).

## Existing code inspected

- No `supabase/` directory, no `lib/supabase/` — greenfield data layer
- `package.json` — no `@supabase/supabase-js` yet; Next 16 / React 19 / TS 5.9
- `.env.local` — already has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (plus Clerk)
- `.env.example` — Supabase vars commented; contains accidental `DB_PASSWORD=` line that must be removed
- UI still uses `lib/mock-articles.ts` on `/` and `/news/[id]`
- Clerk is the only auth provider — **do not use Supabase Auth**

## Decisions / assumptions

1. **Imperative schema file** — ship `supabase/schema.sql` as the canonical SQL to run in Supabase Dashboard → SQL Editor (no local Supabase CLI / declarative `schemas/` yet). Include a short `supabase/README.md` with apply steps.
2. **No `embedding` column yet** — AGENTS §20: add after AI analysis works. Omit pgvector from this schema.
3. **Auth model** — Clerk owns sessions. Supabase is persistence only.
   - Browser: never receive service role.
   - Server pipeline + server query modules: **service role** client (`lib/supabase/server.ts` or `service.ts`).
   - Optional thin **anon** server/browser helpers only if needed for public SELECT paths; prefer service-role queries from Server Components / route handlers for now so pipeline and UI share one typed access path without cookie-based Supabase Auth (`@supabase/ssr` not required unless we add browser Supabase Auth later).
4. **RLS + grants (required)** — Enable RLS on every public table. Explicit grants:
   - `anon` / `authenticated`: `SELECT` only on publicly readable content tables (`sources`, `articles`, `article_analyses`) with policies that allow read of published/analyzed content (or all rows for sources that are active — see below).
   - `service_role`: full DML on all app tables (service role bypasses RLS in Supabase; still grant for Data API exposure safety).
   - `logs`, `oxylabs_schedules`, `oxylabs_schedule_runs`: **no** `anon`/`authenticated` grants — service role only.
5. **Public read policy** — Homepage rule: only analyzed articles surface later. For SELECT policies on `articles`, allow rows where `analyzed_at IS NOT NULL`. For `article_analyses`, allow all rows that join to an analyzed article (or allow SELECT true for analyses — analyses only exist for analyzed articles). Active `sources`: `SELECT` where `is_active = true` (or all sources SELECT for joined display; prefer `true` for simple public catalog of active sources).
6. **IDs** — UUID primary keys (`gen_random_uuid()`) for app tables. Store Oxylabs schedule/job IDs as **`text`** (never `bigint`/`number`) to avoid JS precision loss (AGENTS §18).
7. **Dedupe** — Unique on `articles.original_url`. Also unique on `articles.canonical_url` where not null, or unique index on `canonical_url`. Unique on `article_analyses.article_id` (one analysis per article).
8. **URL existence check helper** — Query module chunks `.in()` filters to **≤15 URLs** per call (AGENTS §9).
9. **Seed** — Do **not** invent production source URLs. Optional empty comment block or `supabase/seed.example.sql` showing insert shape for `sources` only; leave real seeds to the user.
10. **UI wiring deferred** — Query functions exported and ready; pages keep mocks. Do not leave half-wired empty grids.
11. **Env** — Uncomment/document Supabase vars in `.env.example` per AGENTS §21. Remove stray `DB_PASSWORD` from `.env.example`. Do not commit secrets.
12. **Packages** — Install `@supabase/supabase-js` (pin via lockfile). Skip `@supabase/ssr` unless a clear browser-session need appears (Clerk already handles that).

## Schema requirements

Create tables matching AGENTS §7 (+ scheduler tables from §18):

### `sources`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | default `gen_random_uuid()` |
| `name` | text not null | |
| `listing_url` | text not null | homepage entry URL only |
| `parser_strategy` | text null | optional source-specific parser key |
| `is_active` | boolean not null default true | |
| `logo_url` | text null | |
| `created_at` | timestamptz not null default now() | |
| `updated_at` | timestamptz not null default now() | |

### `articles`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `source_id` | uuid not null FK → sources | on delete restrict |
| `original_url` | text not null unique | dedupe key |
| `canonical_url` | text null | unique when present |
| `title` | text not null | |
| `image_url` | text not null | required before save |
| `published_at` | timestamptz not null | required before save |
| `raw_text` | text not null | cleaned article body |
| `scraped_at` | timestamptz not null default now() | |
| `analyzed_at` | timestamptz null | set only after valid analysis saved |
| `created_at` | timestamptz not null default now() | |

Indexes: `source_id`, `analyzed_at`, `published_at desc` (homepage ordering).

### `article_analyses`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `article_id` | uuid not null unique FK → articles | on delete cascade |
| `summary` | text not null | neutral summary |
| `sentiment_score` | numeric not null | −1..1 |
| `sentiment_label` | text not null | `positive` / `neutral` / `negative` |
| `bias_score` | numeric not null | `(right − left) / 100` |
| `bias_label` | text not null | `left` / `center` / `right` / `mixed` / `unclear` |
| `left_percentage` | numeric not null | 0–100 |
| `center_percentage` | numeric not null | 0–100 |
| `right_percentage` | numeric not null | 0–100 |
| `confidence` | numeric not null | 0–1 |
| `framing_notes` | text not null | |
| `loaded_terms` | text[] not null default '{}' | |
| `disclaimer` | text not null | |
| `model` | text not null | |
| `created_at` | timestamptz not null default now() | |

Check constraints (recommended): sentiment/bias/confidence ranges; percentages 0–100; optional check that percentages sum to 100 (allow small float slack or enforce exact if using integers — prefer `integer` 0–100 for percentages if that simplifies UI).

**No `embedding` column.**

### `logs`

Minimal pipeline log store for later `GET /api/logs`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `level` | text not null | e.g. `info` / `warn` / `error` |
| `message` | text not null | |
| `context` | jsonb not null default '{}' | structured details |
| `created_at` | timestamptz not null default now() | |

Index on `created_at desc`.

### `oxylabs_schedules`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `source_id` | uuid not null unique FK → sources | one schedule per source |
| `oxylabs_schedule_id` | text not null unique | stringified large int |
| `is_active` | boolean not null default true | |
| `created_at` / `updated_at` | timestamptz | |

### `oxylabs_schedule_runs`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `schedule_id` | uuid not null FK → oxylabs_schedules | |
| `oxylabs_job_id` | text not null | stringified large int |
| `result_status` | text not null | e.g. `done` / `pending` / `faulted` |
| `processed_at` | timestamptz null | when pipeline processed this job |
| `created_at` | timestamptz not null default now() | |

Unique on `(schedule_id, oxylabs_job_id)`. Index on `result_status`, `processed_at`.

Also include: `enable extension if not exists pgcrypto` (or `uuid-ossp`) for UUID generation as needed by the project’s Postgres version; prefer `gen_random_uuid()` from `pgcrypto`.

## Data access layer requirements

Install `@supabase/supabase-js` and add:

```
lib/supabase/
  types.ts          # Database / Row / Insert / Update types matching schema
  env.ts            # read + validate env vars (server-safe helpers)
  client.ts         # anon createClient (browser-safe; no service role)
  service.ts        # service-role createClient (server-only; import guard or comment)
  queries/
    sources.ts      # getActiveSources, getSourceById, …
    articles.ts     # getAnalyzedArticlesForHome, getArticleById, urlExistsChunked, insertArticle, …
    analyses.ts     # getAnalysisByArticleId, upsertAnalysis, pending-analysis LEFT JOIN helper
    logs.ts         # insertLog, listLogs
    schedules.ts    # listSchedules, upsertSchedule, listUnprocessedDoneRuns, markRunProcessed
```

### Query behavior notes

- **Home feed query**: articles with `analyzed_at IS NOT NULL`, join `sources` + `article_analyses`, order by `published_at` desc, reasonable limit (e.g. 24). Map to a typed DTO the UI can later consume (title, source name, image, published_at, sentiment_label, bias_label, L/C/R %, confidence).
- **Article detail**: by id, require analysis present (or return null → future `notFound()`).
- **Pending analysis**: LEFT JOIN articles → article_analyses; pending when analysis row missing (AGENTS §19). Do not rely on `analyzed_at IS NULL` alone.
- **URL existence**: accept `string[]`, chunk ≤15, query `.in('original_url', chunk)` (and/or canonical) via service client.
- **Joined-table filter gotcha**: never `.eq('foreignTable.column', value)`; filter in JS after fetch when needed (AGENTS §21).
- Prefer small functions, explicit return types, throw or return `{ data, error }` consistently with existing project style (pick one clear pattern).
- Mark service module with a top comment: server-only; never import from Client Components.

## Files likely to change / create

- `supabase/schema.sql` (new)
- `supabase/README.md` (new) — how to apply schema in Dashboard SQL Editor; note Data API exposure / grants
- `supabase/seed.example.sql` (optional new)
- `lib/supabase/**` (new)
- `package.json` / `package-lock.json` — add `@supabase/supabase-js`
- `.env.example` — document Supabase vars; remove `DB_PASSWORD`

Out of scope: `app/page.tsx`, `app/news/[id]/page.tsx`, API routes, scraping, embeddings.

## Security requirements

- Never put `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*` or client bundles.
- RLS on all public tables; explicit grants; pipeline tables not readable by anon.
- No Supabase Auth policies based on `auth.uid()` for news content (Clerk is separate).
- Do not log secrets. Do not commit `.env.local`.

## Acceptance criteria

- [ ] `supabase/schema.sql` creates all six tables with FKs, uniques, indexes, RLS, policies, and explicit GRANTs.
- [ ] No `embedding` / pgvector in this schema.
- [ ] Oxylabs IDs stored as `text`.
- [ ] Typed clients + query modules exist under `lib/supabase/`.
- [ ] URL existence helper chunks at ≤15.
- [ ] Pending-analysis helper uses LEFT JOIN / missing-analysis detection.
- [ ] `.env.example` matches AGENTS env table for Supabase; no accidental DB password.
- [ ] `@supabase/supabase-js` installed and lockfile updated.
- [ ] UI still uses mocks (unchanged product pages).
- [ ] `npm run typecheck` and `npm run lint` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` (clients/env touch server modules — include build)

## Manual test steps (after implementation)

1. Open Supabase Dashboard → SQL Editor → paste and run `supabase/schema.sql`.
2. Confirm tables appear under Table Editor: `sources`, `articles`, `article_analyses`, `logs`, `oxylabs_schedules`, `oxylabs_schedule_runs`.
3. Confirm RLS enabled on each table.
4. Verify `.env.local` still has URL + anon + service role keys (already present).
5. From a one-off server script or Node REPL / temporary `npx tsx` (or a throwaway server-only call during implementation verification): create service client, `select` from `sources` (empty array OK), confirm no auth error.
6. Optionally insert one test `sources` row via SQL Editor using `seed.example.sql` shape, then query it via the service client helper.
7. Confirm homepage and `/news/[id]` still render mock data unchanged.
8. Do **not** call scrape/analyze APIs in this task.

## Out of scope

- Wiring UI to live queries
- Seed of real news sources (user provides URLs later per AGENTS §8)
- Scraping / analyze / scheduler / cron routes
- pgvector embeddings and related-articles cosine query
- Supabase CLI local stack / migrations history (schema.sql + Dashboard apply is enough for this pass)
