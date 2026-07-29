# Prompt: AI article analysis pipeline

## Goal

Implement the **AI article analysis pipeline** for biasly (Skew News) per AGENTS §19:

- Find valid articles missing an `article_analyses` row (LEFT JOIN / pending-analysis check — not `analyzed_at IS NULL` alone)
- Call OpenRouter via Vercel AI SDK + `@openrouter/ai-sdk-provider`
- Validate structured output with Zod
- Save analysis to Supabase and set `analyzed_at` only after a valid save
- Trigger via `POST /api/analyze` protected by `x-biasly-admin-secret`

Do **not** implement in this task:

- pgvector / embeddings / related-articles cosine search (AGENTS §20 — separate prompt after this works)
- Oxylabs Scheduler / Vercel Cron pipeline chaining
- UI changes (homepage and details already read stored analyses when present)

## Skills read

- `.agents/skills/supabase/SKILL.md` — skimmed `https://supabase.com/changelog.md`; relevant notes:
  - Tables are not auto-exposed to Data API (already handled in `schema.sql` with explicit GRANTs)
  - Never expose `service_role` to browser; pipeline writes use `createServiceClient()` only
  - Do not use `.eq('foreignTable.column', value)` for joined filters (AGENTS gotcha); filter joined pending state in JS or use a safe PostgREST null-embed pattern verified at implement time
  - Pin package versions and commit lockfile when adding deps
- `.agents/skills/ai-sdk/SKILL.md` — do not write AI SDK code from memory; verify against installed `node_modules/ai` docs after install; use OpenRouter provider (not OpenAI direct)
- `AGENTS.md` §5–6 (layers/stack), §14–15 (POST + admin secret), §19 (analysis rules, OpenRouter env, Zod validation, logging), §21–22 (security, checks)
- OpenRouter AI SDK docs: `https://ai-sdk.dev/providers/community-providers/openrouter` — `createOpenRouter`, chat models, `generateObject` / structured output with Zod; optional `response-healing` plugin for malformed JSON

## Existing code inspected

| Area                                     | Status                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `article_analyses` schema + RLS + grants | Ready in `supabase/schema.sql` (no `embedding` column yet — correct for §19)                |
| `lib/supabase/types.ts`                  | Analysis row/insert types + `SentimentLabel` / `BiasLabel` match schema                     |
| `lib/supabase/queries/analyses.ts`       | `getArticlesPendingAnalysis`, `getAnalysisByArticleId`, `upsertAnalysis` exist              |
| `lib/supabase/queries/articles.ts`       | `markArticleAnalyzed` exists                                                                |
| `lib/supabase/queries/logs.ts`           | `insertLog` exists                                                                          |
| `lib/api/admin-secret.ts`                | `assertAdminSecret` pattern used by scrape route                                            |
| `app/api/scrape/route.ts`                | Thin POST handler pattern to mirror (`maxDuration`, Zod body, 401/400/500)                  |
| `lib/pipeline/scrape.ts` + `types.ts`    | Orchestration + typed summary pattern to mirror for analyze                                 |
| `package.json`                           | Has `zod`, `server-only`; **missing** `ai` and `@openrouter/ai-sdk-provider`                |
| `.env.example`                           | Documents `OPENROUTER_API_KEY`, `OPENROUTER_ANALYSIS_MODEL`, optional `ANALYSIS_BATCH_SIZE` |
| `.env.local`                             | Does **not** yet contain OpenRouter vars — user must add before live testing                |
| `app/api/analyze`                        | Does not exist                                                                              |

**Pending-query caveat:** `getArticlesPendingAnalysis(limit)` currently selects the oldest `limit` articles then filters to those without analyses in JS. If the oldest N already have analyses, it can return an empty batch while newer pending articles remain. Harden this during implementation (see decisions).

## Decisions / assumptions

1. **Scope = AGENTS §19 only.** No embeddings, no `OPENROUTER_EMBEDDING_MODEL` wiring, no schema ALTER for `vector(1536)`.
2. **Default run:** process **all** pending articles in batches until none remain (or until optional request limit is hit). Do **not** hardcode a one-time cap of 10.
3. **Optional request body** (Zod-validated, strict):
   ```ts
   {
     articleIds?: string[]; // UUID[] — only analyze these if still pending
     limit?: number;        // max articles to analyze this run (optional)
     batchSize?: number;    // override ANALYSIS_BATCH_SIZE for this run (optional)
   }
   ```
4. **Batch size:** `ANALYSIS_BATCH_SIZE` env, default **5**. Clamp to a sane max (e.g. 20) to avoid timeouts.
5. **Packages to add** (pin via lockfile):
   - `ai` (Vercel AI SDK)
   - `@openrouter/ai-sdk-provider`
   - After install, verify structured-output API against bundled docs (`generateObject` vs newer `generateText` + `Output.object` — use whatever the installed SDK version documents as current).
6. **OpenRouter client:**
   - Server-only module(s) under `lib/ai/`
   - Auth with `OPENROUTER_API_KEY`
   - Model from `OPENROUTER_ANALYSIS_MODEL` (required; `.env.example` default `openai/gpt-oss-20b:free` for dev)
   - Persist the exact OpenRouter model id string into `article_analyses.model`
   - Never log the API key
7. **Structured analysis output** (Zod). Model returns fields like:
   - `summary` (neutral)
   - `sentimentScore` (−1…1), `sentimentLabel` (`positive` \| `neutral` \| `negative`)
   - `politicalFramingLabel` (`left` \| `center` \| `right` \| `mixed` \| `unclear`)
   - `leftPercentage`, `centerPercentage`, `rightPercentage` (0–100, must sum to 100)
   - `confidence` (0–1)
   - `framingNotes`, `loadedTerms` (string[]), `disclaimer`
8. **Derived `bias_score`:** compute in code as `(rightPercentage - leftPercentage) / 100`. Do not trust a model-supplied bias score for the DB column.
9. **Framing rules in the system/user prompt:** AI-estimated only; use article text evidence only; do not infer from source name alone; if evidence is weak use `unclear` + low confidence; label should match strongest percentage unless confidence is low or percentages are close.
10. **Validation failure:** if Zod/schema validation fails, **retry once**; if still invalid, count as failed and do **not** save or set `analyzed_at`.
11. **Save order:** `upsertAnalysis` → then `markArticleAnalyzed(articleId)`. Never mark analyzed without a saved analysis row.
12. **Pending detection harden:**
    - Prefer fetching candidates with embed `article_analyses ( id )` and filter empty in JS (existing pattern), but **page/scan** until a full batch of pending articles is collected or the table is exhausted — do not stop after one under-filled page that only contained already-analyzed rows.
    - Alternatively, if a verified PostgREST filter like null-on-embed works with the installed supabase-js without the forbidden `.eq('foreignTable.column')` gotcha, use that; verify with a real query before relying on it.
    - When `articleIds` is provided, load those articles and keep only ones that still lack an analysis row.
13. **Valid articles only:** analyze rows that have required content fields already (title, raw_text, image_url, published_at) — scraped articles already pass the content gate; skip empty `raw_text` defensively.
14. **Logging:** neat `console.log` progress (analysis started, batch N, per-article success/skip/fail, completed). `insertLog` on start/complete/fail with summary context. Return a typed summary JSON from the API.
15. **Summary shape** (camelCase in API, mirror scrape style):
    ```ts
    {
      status: "completed" | "failed";
      pendingFound: number;
      analyzed: number;
      skipped: number;
      failed: number;
      batches: number;
      model: string;
      totalDurationMs: number;
      errors?: { articleId?: string; message: string }[];
    }
    ```
16. **Route:** `POST /api/analyze`, `export const maxDuration = 300`, admin secret required, thin handler only.
17. **Architecture layers:**
    - `lib/ai/` — OpenRouter client, env, Zod schema, single-article analyze call
    - `lib/pipeline/analyze.ts` — batch orchestration
    - `lib/pipeline/types.ts` — extend with analyze summary types (or adjacent types file)
    - `app/api/analyze/route.ts` — thin route
    - Reuse `lib/supabase/queries/analyses.ts` + `articles.ts` + `logs.ts`
18. **Security:** no OpenRouter calls or service-role client from Client Components; mark AI/pipeline modules `import "server-only"`.
19. **UI:** leave pages unchanged; once `analyzed_at` is set and analysis exists, existing home/detail queries will surface them.

## Files likely to change / create

| Path                               | Action                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `package.json` / lockfile          | add `ai`, `@openrouter/ai-sdk-provider`                                       |
| `lib/ai/env.ts`                    | read `OPENROUTER_API_KEY`, `OPENROUTER_ANALYSIS_MODEL`, `ANALYSIS_BATCH_SIZE` |
| `lib/ai/client.ts`                 | create OpenRouter provider instance                                           |
| `lib/ai/schema.ts`                 | Zod schema for analysis output + map to DB insert                             |
| `lib/ai/analyze-article.ts`        | single-article model call + validate + retry-once                             |
| `lib/pipeline/analyze.ts`          | batch loop until pending exhausted / limit hit                                |
| `lib/pipeline/types.ts`            | analyze summary + options types                                               |
| `lib/supabase/queries/analyses.ts` | harden `getArticlesPendingAnalysis` paging / selection                        |
| `app/api/analyze/route.ts`         | `POST` handler                                                                |
| `.env.example`                     | confirm OpenRouter + batch vars stay in sync (already mostly present)         |

No schema migration required for §19.

## Implementation requirements

### Env

- Require `OPENROUTER_API_KEY` and `OPENROUTER_ANALYSIS_MODEL` at call time with clear errors if missing.
- Optional `ANALYSIS_BATCH_SIZE` (default 5).

### Single-article analyze

1. Build prompt from `title` + `raw_text` (truncate extremely long bodies if needed for token safety; prefer keeping the start + enough body for framing).
2. Call OpenRouter structured generation with the Zod schema.
3. Validate percentages sum to 100 (schema refine).
4. On first failure, retry once; on second failure, return failed result without DB write.
5. Map to `TablesInsert<"article_analyses">` including derived `bias_score` and `bias_label` from `politicalFramingLabel`.
6. Upsert analysis, then mark `analyzed_at`.

### Pipeline `runAnalyzePending`

1. Resolve options (articleIds / limit / batchSize).
2. Loop:
   - Load next pending batch
   - If empty, break
   - Analyze each article sequentially within the batch (simpler error isolation; avoid hammering free-tier rate limits)
   - Accumulate counters
   - Stop when `limit` reached or no pending remain
3. Log progress and final summary; persist start/complete logs via `insertLog`.
4. Return summary; set `status: "failed"` only for fatal pipeline errors (e.g. missing env), not for per-article model failures (those increment `failed` and overall status stays `completed` unless nothing could run due to config).

### API

- Mirror scrape route auth/body/error handling.
- Return summary object as JSON; `401` missing/invalid secret; `400` bad body; `500` fatal.

## Security requirements

- Never expose `OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `BIASLY_ADMIN_SECRET` to browser code.
- Never put admin secret in query string.
- Reject missing/invalid `x-biasly-admin-secret` with `401`.
- No model calls from Client Components.
- Do not log full article bodies or API keys in production logs (log article id + title snippet + status only).

## Acceptance criteria

- [ ] `POST /api/analyze` with valid admin secret analyzes pending articles and inserts `article_analyses` rows
- [ ] `analyzed_at` is set only after a successful analysis save
- [ ] Pending detection uses absence of `article_analyses` row, not `analyzed_at` alone
- [ ] Default run processes all pending (batched), not a hardcoded 10
- [ ] Optional `articleIds` / `limit` / `batchSize` work
- [ ] Invalid model output is retried once then counted failed without saving
- [ ] Percentages sum to 100; `bias_score` derived in code
- [ ] Console + API summary include analyzed / skipped / failed / duration
- [ ] No embedding / pgvector work
- [ ] `npm run typecheck` and `npm run lint` pass; `npm run build` if routes/deps changed

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
```

## Exact manual test steps

1. Ensure Supabase has at least one scraped article **without** an `article_analyses` row (run scrape first if needed).
2. Add to `.env.local` (do not commit):
   ```
   OPENROUTER_API_KEY=...
   OPENROUTER_ANALYSIS_MODEL=openai/gpt-oss-20b:free
   # ANALYSIS_BATCH_SIZE=5
   ```
3. Start the app: `npm run dev` and watch that terminal for analysis logs.
4. Unauthorized:
   ```bash
   curl -s -X POST http://localhost:3000/api/analyze \
     -H 'content-type: application/json' \
     -d '{}'
   # expect 401
   ```
5. Analyze all pending:
   ```bash
   curl -s -X POST http://localhost:3000/api/analyze \
     -H 'content-type: application/json' \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
     -d '{}'
   ```
6. Confirm response summary (`analyzed` > 0 if pending existed) and that home/details show the new analyses.
7. Re-run the same curl — expect `pendingFound: 0` / `analyzed: 0` (idempotent; no duplicate analyses).
8. Optional limited run (after inserting more unanalyzed articles):
   ```bash
   curl -s -X POST http://localhost:3000/api/analyze \
     -H 'content-type: application/json' \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
     -d '{"limit": 2, "batchSize": 2}'
   ```
