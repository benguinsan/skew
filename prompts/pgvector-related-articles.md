# Prompt: pgvector embeddings + Related Articles

## Goal

Implement **AGENTS §20** for biasly:

1. Enable **pgvector** and add `embedding vector(1536)` to `article_analyses` (plus IVFFlat cosine index).
2. Extend the **AI analysis pipeline** so each successful run also generates and saves an OpenRouter embedding; set `analyzed_at` only after **both** analysis and embedding are saved.
3. Support **embedding backfill** for existing analysis rows where `embedding IS NULL` without re-running full structured analysis.
4. Add **`getRelatedArticles(articleId, embedding)`** (service role) using cosine distance.
5. Wire the news details page **Related Stories** section to real similarity results; **hide the section** when the current article has no embedding.

Do **not** implement Oxylabs Scheduler / Vercel Cron in this task. Do not redesign the Related Stories UI (reuse `RelatedStoryCard`).

## Skills read

- `.agents/skills/supabase/SKILL.md` — skimmed `https://supabase.com/changelog.md`; relevant notes:
  - Tables are not auto-exposed to Data API (existing GRANTs in `schema.sql` remain; no new public tables).
  - Never expose `service_role` to browser; all embedding writes + related queries use `createServiceClient()`.
  - Pin package versions / lockfile only if new deps are added (prefer reusing installed `ai` + `@openrouter/ai-sdk-provider`).
  - Prefer verifying pgvector patterns against current Supabase docs (vector columns, RPC for `<=>`, indexes).
- `.agents/skills/ai-sdk/SKILL.md` — do not write AI SDK code from memory; verify `embed` / embedding-model APIs against installed `node_modules/ai` + `@openrouter/ai-sdk-provider` (project already has `ai@^7` and OpenRouter provider with `textEmbeddingModel`).
- `AGENTS.md` §7 (schema sync: `schema.sql` + `types.ts` + Dashboard ALTER), §19 (pending LEFT JOIN semantics; analysis save rules), §20 (full feature), §21–22 (security, env, checks).
- Supabase docs verified at prompt time:
  - [Vector columns](https://supabase.com/docs/guides/ai/vector-columns) — enable `vector` extension; PostgREST **does not** support `<=>` directly → wrap similarity in a **Postgres RPC** and call via `.rpc()`.
  - Cosine distance operator: `<=>`. IVFFlat with `vector_cosine_ops` per AGENTS.

## Existing code inspected

| Area                                     | Status                                                                                          |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `supabase/schema.sql`                    | Has `article_analyses` **without** `embedding`; comment says pgvector comes after AI analysis   |
| `supabase/README.md`                     | Lists embedding as out of scope                                                                 |
| `lib/supabase/types.ts`                  | `article_analyses` Row/Insert/Update lack `embedding`; `Database.Functions` empty               |
| `lib/supabase/queries/analyses.ts`       | Pending = no analysis row only — **must extend** for `embedding IS NULL` backfill               |
| `lib/supabase/queries/articles.ts`       | Temporary `getRelatedAnalyzedArticles` (home-feed slice) — replace with real similarity         |
| `lib/ai/analyze-article.ts`              | Analysis + upsert + `markArticleAnalyzed` — no embedding yet                                    |
| `lib/ai/client.ts` / `env.ts`            | Analysis model only; embedding model env commented in `.env.example`                            |
| `lib/pipeline/analyze.ts`                | Batches pending articles via analyses queries                                                   |
| `app/news/[id]/page.tsx`                 | Related Stories already rendered when `related.length > 0`; still uses stub query               |
| `components/news/related-story-card.tsx` | Ready; no UI redesign needed                                                                    |
| Packages                                 | `ai` + `@openrouter/ai-sdk-provider` already installed; OpenRouter exposes `textEmbeddingModel` |

## Decisions / assumptions

1. **Scope = AGENTS §20 only.** No scheduler/cron changes. No homepage card changes.
2. **Extension + column + index** (update `supabase/schema.sql` as source of truth **and** provide a Dashboard-ready `ALTER` block the user must run on the live DB before testing):
   ```sql
   create extension if not exists vector with schema extensions;

   alter table public.article_analyses
     add column if not exists embedding extensions.vector(1536);

   -- IVFFlat cosine index (AGENTS §20). lists=100 is fine for growth;
   -- note IVFFlat is less useful on tiny tables but required by product spec.
   create index if not exists article_analyses_embedding_ivfflat_idx
     on public.article_analyses
     using ivfflat (embedding extensions.vector_cosine_ops)
     with (lists = 100);
   ```
   If `extensions.vector` / ops naming fails on the project (search_path / how Studio enabled the extension), fall back to the common Dashboard form `vector(1536)` / `vector_cosine_ops` and document the exact SQL that worked in the prompt’s test notes after implementation.
3. **Similarity RPC required** (PostgREST cannot order by `<=>`). Add something like:
   ```sql
   create or replace function public.match_related_articles(
     query_embedding extensions.vector(1536),
     exclude_article_id uuid,
     match_count int default 5
   )
   returns table (
     id uuid,
     title text,
     image_url text,
     published_at timestamptz,
     source_name text,
     sentiment_label text,
     bias_label text,
     left_percentage integer,
     center_percentage integer,
     right_percentage integer,
     confidence numeric
   )
   language sql
   stable
   as $$
     select
       a.id,
       a.title,
       a.image_url,
       a.published_at,
       s.name as source_name,
       aa.sentiment_label,
       aa.bias_label,
       aa.left_percentage,
       aa.center_percentage,
       aa.right_percentage,
       aa.confidence
     from public.article_analyses aa
     join public.articles a on a.id = aa.article_id
     join public.sources s on s.id = a.source_id
     where aa.embedding is not null
       and a.analyzed_at is not null
       and a.id <> exclude_article_id
     order by aa.embedding <=> query_embedding
     limit greatest(match_count, 0);
   $$;
   ```
   - Grant `EXECUTE` to `service_role` (and optionally `authenticated`/`anon` only if needed — prefer **service_role only** since the page loads related stories via server `createServiceClient()`).
   - Do **not** mark the function `SECURITY DEFINER` unless unavoidable; keep invoker privileges.
4. **Types:** add `embedding: number[] | null` to `article_analyses` Row / optional on Insert+Update. Register `match_related_articles` under `Database["public"]["Functions"]`.
5. **Embedding model (OpenRouter):**
   - Env: `OPENROUTER_EMBEDDING_MODEL` optional; default **`openai/text-embedding-3-small`** (1536 dims).
   - Uncomment / document in `.env.example`.
   - Server-only helpers in `lib/ai/env.ts` + `getEmbeddingModel()` / `getEmbeddingModelId()` in `lib/ai/client.ts` using `createOpenRouter().textEmbeddingModel(modelId)`.
   - Call AI SDK `embed({ model, value })` — verify exact API against installed package docs (`node_modules/ai/docs/03-ai-sdk-core/30-embeddings.mdx`).
6. **Embedding input text:** title + cleaned `raw_text` (same soft truncation budget as analysis, e.g. ~12k chars). Do not send source name as framing signal beyond what’s in the article body.
7. **Save rules (critical):**
   - New articles (no analysis row): run structured analysis → generate embedding → `upsertAnalysis` **including embedding** → only then `markArticleAnalyzed`.
   - If analysis succeeds but embedding fails (after one retry): treat as **failed** — do **not** set `analyzed_at`. Prefer not leaving a permanent analysis-without-embedding for brand-new runs; if an analysis row was already upserted without embedding mid-failure, the next pending scan must pick it up for backfill (see below).
   - Prefer: generate both in memory, then single upsert with analysis fields + embedding, then mark analyzed. Cleaner.
8. **Pending detection extension (AGENTS §20 backfill):**
   - Still treat “no `article_analyses` row” as full pending (analysis + embedding).
   - **Also** treat rows where analysis exists and `embedding IS NULL` as pending for **embedding-only** backfill (do not re-call the analysis LLM).
   - Update `getArticlesPendingAnalysis` / `getPendingArticlesByIds` (and helpers) to return enough signal to distinguish:
     - `mode: "full"` — missing analysis
     - `mode: "embedding"` — analysis present, embedding null
   - Pipeline (`analyzeAndSaveArticle` or a thin wrapper) branches accordingly.
9. **Related query API:**
   - Replace stub `getRelatedAnalyzedArticles` with:
     `getRelatedArticles(articleId: string, embedding: number[], limit = 5): Promise<HomeArticleCard[]>`
   - Implementation: `supabase.rpc('match_related_articles', { query_embedding: embedding, exclude_article_id: articleId, match_count: limit })` then map to `HomeArticleCard`.
   - Cap default at **5** (AGENTS §20).
10. **News details page:**
    - After `getArticleDetailById`, if `detail.analysis.embedding` is null/empty → do **not** call related query; render **no** Related Stories section.
    - Else call `getRelatedArticles(detail.article.id, detail.analysis.embedding)` and map via existing `toRelatedStoryView`.
    - Keep existing layout/copy (“Related Stories”).
11. **Security:** embeddings + OpenRouter stay server-only. Never put `OPENROUTER_*` or service role in client components. Related fetch stays in the Server Component / query module.
12. **Docs:** update `supabase/README.md` to include enabling vector + running the ALTER/RPC SQL; remove “embedding out of scope”.

## Files likely to change

- `supabase/schema.sql` — extension, embedding column, IVFFlat index, `match_related_articles` RPC + grants
- `supabase/README.md` — apply steps for pgvector
- `lib/supabase/types.ts` — embedding + Functions typing
- `lib/supabase/queries/analyses.ts` — pending modes + select embedding where needed
- `lib/supabase/queries/articles.ts` — `getRelatedArticles`; remove/replace stub
- `lib/ai/env.ts` — embedding model helper
- `lib/ai/client.ts` — embedding model factory
- `lib/ai/analyze-article.ts` (and/or new `lib/ai/embed-article.ts`) — generate + save embedding; analyzed_at gating; backfill path
- `lib/pipeline/analyze.ts` — only if summary/logging needs embedding backfill counts (optional; keep small)
- `app/news/[id]/page.tsx` — gate Related Stories on embedding
- `.env.example` — document `OPENROUTER_EMBEDDING_MODEL`

Optional small helper SQL file (e.g. `supabase/alter-pgvector.sql`) with the exact Dashboard paste for existing projects — acceptable if it keeps `schema.sql` as the greenfield source of truth.

## Implementation requirements

1. Schema + types + README in sync.
2. Analysis pipeline generates 1536-dim embeddings via OpenRouter and persists them.
3. `analyzed_at` set only after analysis **and** embedding are saved.
4. Next `POST /api/analyze` backfills null embeddings without re-analyzing.
5. Related Stories on details use cosine similarity (top 5); hidden when current article has no embedding.
6. No browser exposure of secrets or model calls.
7. Keep route handlers thin; business logic stays in `lib/`.

## Security requirements

- Service role only for writes and related RPC.
- No `SECURITY DEFINER` RPC unless required; if used, keep out of broad `EXECUTE` for `anon`/`authenticated` and include least privilege.
- Do not log API keys or full embedding vectors in console (log article id / counts only).
- Embedding model id may be logged in pipeline context; API key must not.

## Acceptance criteria

- [ ] `schema.sql` enables vector, adds `embedding vector(1536)`, IVFFlat cosine index, and related-articles RPC.
- [ ] Live DB ALTER instructions (or `alter-pgvector.sql`) provided and documented for the user to run before testing.
- [ ] `lib/supabase/types.ts` includes `embedding` and RPC function types.
- [ ] `OPENROUTER_EMBEDDING_MODEL` documented; default `openai/text-embedding-3-small`.
- [ ] Full analyze path saves embedding before `analyzed_at`.
- [ ] Articles with analysis but null embedding are picked up for embedding-only backfill.
- [ ] `getRelatedArticles(articleId, embedding)` returns up to 5 similar analyzed articles ordered by cosine distance.
- [ ] News details shows Related Stories only when current embedding exists and matches are found.
- [ ] Stub “related from home feed” behavior removed.
- [ ] `npm run typecheck` and `npm run lint` pass; `npm run build` if routes/server modules changed.

## Checks to run

From repo root after implementation:

```bash
npm run typecheck
npm run lint
npm run build
```

Report exact results. Do not claim pass without running.

## Exact manual test steps (after implementation)

**Prerequisites**

1. In Supabase Dashboard → **Database → Extensions**, enable **vector** (if not already).
2. SQL Editor: run the ALTER / index / RPC SQL from the prompt deliverable (or full updated `schema.sql` sections).
3. Ensure `.env.local` has `OPENROUTER_API_KEY`, `OPENROUTER_ANALYSIS_MODEL`, and optionally `OPENROUTER_EMBEDDING_MODEL` (default is fine).
4. `npm run dev` — watch the terminal for `[analyze]` logs.

**Embedding generation**

```bash
# Process pending (full analysis + embeddings, and/or embedding backfill)
curl -s -X POST 'http://localhost:3000/api/analyze' \
  -H 'content-type: application/json' \
  -H 'x-biasly-admin-secret: '"$BIASLY_ADMIN_SECRET" \
  -d '{}'
```

Optional limited run:

```bash
curl -s -X POST 'http://localhost:3000/api/analyze' \
  -H 'content-type: application/json' \
  -H 'x-biasly-admin-secret: '"$BIASLY_ADMIN_SECRET" \
  -d '{"limit":3}'
```

Confirm in Supabase Table Editor that new/updated `article_analyses` rows have non-null `embedding`, and matching `articles.analyzed_at` is set.

**Backfill check (optional)**

1. In SQL Editor, set `embedding = null` for one analyzed article’s analysis row.
2. Re-run `POST /api/analyze` with a small limit.
3. Confirm that article’s embedding is filled **without** changing analysis text fields unexpectedly.

**Related Articles UI**

1. Open an analyzed article with an embedding: `http://localhost:3000/news/<article-uuid>`.
2. Confirm **Related Stories** appears (when ≥1 other embedded article exists) and links work.
3. For an article with no embedding (or force null), confirm Related Stories is **hidden**.

## Visual / UI notes (details page only)

- No layout redesign. Keep existing Related Stories heading, 2-column grid, and `RelatedStoryCard` anatomy.
- Section remains below article body, above/aside unchanged.
- Empty state = omit section entirely (not a placeholder card).
