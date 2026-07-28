# Prompt: Oxylabs manual scrape-to-insert pipeline

## Goal

Implement the **manual Oxylabs scraping pipeline** for biasly (Skew News): fetch active source homepages via Oxylabs Web Scraper API, extract candidate article links, filter non-articles, dedupe against Supabase, scrape article detail pages, validate/clean content, and append-only insert valid articles.

Trigger via `POST /api/scrape` protected by `x-biasly-admin-secret`. Also add thin read routes `GET /api/sources` and `GET /api/logs`.

Do **not** implement Oxylabs Scheduler, Vercel Cron, AI analysis, embeddings, or UI wiring in this task.

## Skills read

- `.agents/skills/oxylabs-web-scraper/SKILL.md` (+ examples) — Realtime `POST https://realtime.oxylabs.io/v1/queries`, `source: "universal"`, Basic Auth via `OXY_WSA_USERNAME` / `OXY_WSA_PASSWORD`, HTML in `results[0].content`
- `.agents/skills/supabase/SKILL.md` — changelog skim (Data API grants already applied in schema); service-role writes only; no service role in browser
- `AGENTS.md` sections 5–6 (layers/stack), 8–13 (source selection, scrape-to-insert, storage, link extraction, URL filtering, validation), 14–17 (API methods, admin secret, manual scrape, test steps), 21–22 (security, env, checks)
- Next.js docs: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` — App Router `route.ts` handlers with Web `Request`/`Response`

## Existing code inspected

- **DB ready**: `supabase/schema.sql`, typed clients (`lib/supabase/service.ts`, `env.ts`, `types.ts`)
- **Query helpers already exist**:
  - `getActiveSources`, `getSourcesByIds` — `lib/supabase/queries/sources.ts`
  - `findExistingOriginalUrls` (≤15 URL chunks), `insertArticle` — `lib/supabase/queries/articles.ts`
  - `insertLog`, `listLogs` — `lib/supabase/queries/logs.ts`
  - Schedule helpers exist but are **out of scope** for this task
- **No** `app/api/**` routes yet
- **No** Cheerio / Zod in `package.json` yet — add them
- **Seeded active sources in Supabase** (queried live):

  | Name         | listing_url                          | parser_strategy |
  | ------------ | ------------------------------------ | --------------- |
  | BBC          | https://www.bbc.com/news             | null            |
  | CNN          | https://www.cnn.com                  | null            |
  | Fox News     | https://www.foxnews.com              | null            |
  | The Guardian | https://www.theguardian.com/us       | null            |

- `.env.local` already has `OXY_WSA_*` and `BIASLY_ADMIN_SECRET`; `.env.example` still comments them out
- UI still on `lib/mock-articles.ts` — leave pages unchanged
- Clerk `proxy.ts` matches `/api` — scrape routes use admin secret, not Clerk session

## Decisions / assumptions

1. **Scope = manual scrape only** (AGENTS §9 + §16). Scheduler / cron / analyze are separate prompts.
2. **Default run** when body omits selection: all active sources, **up to 5 valid articles inserted per source** (not 5 detail scrapes — stop after 5 successful inserts per source, or when candidates are exhausted). Prefer fewer good inserts over bad ones.
3. **Optional request body** (Zod-validated):
   ```ts
   {
     sourceIds?: string[];      // subset of active sources
     sourceNames?: string[];    // alternative filter by name (case-insensitive)
     perSourceLimit?: number;   // default 5, max 20
   }
   ```
4. **Oxylabs Realtime** for both homepage and article detail fetches:
   - `source: "universal"`
   - `url: <target>`
   - `render: "html"` for JS-heavy news sites (BBC/CNN/Fox/Guardian)
   - Parse HTML from `results[0].content` when `status_code` is 200
   - Timeouts: allow long waits (client abort ~180s) for rendered requests
5. **Parser strategies**: set optional `parser_strategy` keys on sources when useful (`bbc`, `cnn`, `fox`, `guardian`). Implement strategy modules keyed by that string; fall back to hostname-based detection if `parser_strategy` is null so seeded rows work without a DB update. Optionally update seed / one-time SQL note to set strategies — do not require a schema change.
6. **Homepage extraction**: Cheerio — collect links from visible story/card areas only; reject navigation/footer/menu. Apply the **non-article reject list** (AGENTS §9) before detail scrape.
7. **Source-specific article URL checks** (strict; reject when uncertain):
   - **BBC**: keep paths like `/news/articles/...` or `/news/...-<id>` article patterns; reject `/news` alone, sport/live/category section paths
   - **CNN**: prefer `/YYYY/MM/DD/...` or clear story slugs under news sections; reject section index pages
   - **Fox**: reject show/game/live/category; keep article-like `/.../...html` or story paths
   - **Guardian**: keep long article slugs with date or id patterns; reject section pages like `/us/environment`, `/thefilter-us`
8. **URL normalize/dedupe**: absolute URLs, strip tracking query params (`utm_*`, etc.), trailing slash consistency; in-memory dedupe then `findExistingOriginalUrls`.
9. **Article content gate** (AGENTS §13): require article URL, specific title, meaningful body, image URL, published date. Body pass: ≥3 meaningful paragraphs **or** ≥900 meaningful characters after cleanup. Split single large paragraph when needed. Clean scripts/styles/ads/newsletter/related/nav dumps from `raw_text`.
10. **Append-only inserts** via `insertArticle`. Never delete/replace articles during scrape. On unique conflict, count as duplicate skip (do not throw the whole run).
11. **Run logging**: neat `console.log` progress (AGENTS §9 run logging list). Also `insertLog` for start/complete/fail with summary context. Return the same summary object in the API JSON response.
12. **Admin secret** (AGENTS §15): shared helper `assertAdminSecret(request)` comparing `x-biasly-admin-secret` to `BIASLY_ADMIN_SECRET`; `401` on missing/invalid. Never put secret in query string or client bundles.
13. **Architecture layers** (keep separate):
    - `lib/oxylabs/` — HTTP client only
    - `lib/parsing/` — link extraction, URL filters, HTML → article fields, cleanup
    - `lib/pipeline/` — scrape-to-insert orchestration (reusable later by scheduler)
    - `app/api/*/route.ts` — thin handlers only
14. **Server-only**: mark Oxylabs/pipeline modules with `import "server-only"` (add `server-only` package if missing). No Oxylabs calls from Client Components.
15. **Packages**: add `cheerio`, `zod`, and `server-only` (pin via lockfile).
16. **Route timeouts**: set `export const maxDuration = 300` (or highest available) on `POST /api/scrape` so multi-source rendered scrapes can finish in local/Vercel.
17. **Clerk**: leave `proxy.ts` as-is; admin secret is the gate for scrape mutations. Do not require a signed-in user for `/api/scrape`.

## Files likely to change / create

| Path | Action |
| ---- | ------ |
| `package.json` / lockfile | add cheerio, zod, server-only |
| `.env.example` | uncomment/document `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`, `BIASLY_ADMIN_SECRET` |
| `lib/oxylabs/client.ts` | Realtime scrape helper |
| `lib/oxylabs/env.ts` | read Oxylabs env vars |
| `lib/auth/admin.ts` (or `lib/api/admin-secret.ts`) | admin header check |
| `lib/parsing/urls.ts` | normalize, tracking strip, absolute resolve |
| `lib/parsing/reject.ts` | non-article reject helpers |
| `lib/parsing/homepage.ts` | extract candidate links (+ strategy dispatch) |
| `lib/parsing/article.ts` | detail parse: title, image, date, body cleanup/validate |
| `lib/parsing/strategies/*.ts` | bbc/cnn/fox/guardian URL + selector tweaks |
| `lib/pipeline/scrape.ts` | scrape-to-insert orchestration + summary types |
| `lib/pipeline/types.ts` | typed run summary / counters |
| `app/api/scrape/route.ts` | `POST` |
| `app/api/sources/route.ts` | `GET` active sources |
| `app/api/logs/route.ts` | `GET` recent logs (admin-secret protected) |

Optional: small SQL note or seed update to set `parser_strategy` on the four sources — not required if hostname fallback works.

## Implementation requirements

### Oxylabs client

- `scrapeHtml(url: string): Promise<{ html: string; statusCode: number; url: string }>`
- Basic Auth from env; throw clear errors on 401/403/429/non-200
- Never log password or full HTML dumps (log URL + status + length only)

### Pipeline (`runScrapeToInsert`)

1. Resolve selected active sources (by ids/names or all active).
2. For each source:
   - Log start
   - `scrapeHtml(listing_url)`
   - Extract candidates → reject non-articles → normalize → dedupe vs DB
   - For each remaining candidate until `perSourceLimit` inserts:
     - Detail `scrapeHtml`
     - Validate + clean
     - `insertArticle` with `source_id`, `original_url`, `canonical_url`, `title`, `image_url`, `published_at`, `raw_text`
     - Track inserted / rejected / failed with reasons
3. Continue other sources if one source errors (source-level error counted; do not abort entire run unless catastrophic).
4. Return summary:
   ```ts
   {
     status: "completed" | "failed";
     sourcesChecked: number;
     candidatesFound: number;
     candidatesRejected: number;
     duplicatesSkipped: number;
     detailPagesScraped: number;
     articlesInserted: number;
     articlesRejected: number;
     articlesFailed: number;
     totalDurationMs: number;
     rejectionReasons: Record<string, number>;
     errors?: { source?: string; message: string }[];
   }
   ```

### API routes

- `POST /api/scrape` — admin secret; body optional; runs pipeline; returns summary JSON; `500` on total failure with message
- `GET /api/sources` — return active sources (`id`, `name`, `listing_url`, `parser_strategy`, `logo_url`); no admin secret required (public catalog) **or** protect with admin secret for consistency — prefer **no secret** for GET sources since RLS already allows public read of active sources; use service client server-side
- `GET /api/logs` — require admin secret; `?limit=` default 100; return `listLogs`

### Env

Update `.env.example` to document:

```
OXY_WSA_USERNAME=
OXY_WSA_PASSWORD=
BIASLY_ADMIN_SECRET=
```

Do not commit secrets. Do not add `CRON_SECRET` to `.env.local`.

## Security requirements

- Never expose Oxylabs credentials, service role key, or admin secret to browser / `NEXT_PUBLIC_*`
- Never call Oxylabs or mutate articles from Client Components
- Admin secret only via `x-biasly-admin-secret` header
- Reject missing/invalid secret with `401`
- Do not scrape arbitrary user-supplied URLs outside selected sources’ listing + filtered candidate article URLs from those homepages
- Sanitize logs: no credentials, truncate huge strings

## Acceptance criteria

- [ ] `POST /api/scrape` with valid admin secret scrapes selected active sources and inserts only valid articles
- [ ] Missing/invalid admin secret → `401`
- [ ] Homepage-only entry; no inventing source URLs; no crawling listing subpages for more listings
- [ ] Non-article URLs rejected before detail scrape
- [ ] Duplicates skipped via chunked URL existence check (≤15)
- [ ] Articles require image URL + published date + cleaned meaningful body
- [ ] Append-only; no wipe of existing articles
- [ ] Console progress + final summary object in response
- [ ] `GET /api/sources` and `GET /api/logs` work as specified
- [ ] No scheduler/cron/analyze/UI changes
- [ ] `npm run typecheck` and `npm run lint` pass; `npm run build` passes (new routes)

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
```

## Exact manual test steps (after implementation)

1. Ensure `.env.local` has `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`, `BIASLY_ADMIN_SECRET`, and Supabase service role vars.
2. Start the app: `npm run dev` — watch this terminal for scrape progress logs.
3. List sources:
   ```bash
   curl -s http://localhost:3000/api/sources | jq
   ```
4. Run scrape (default: all active sources, 5 per source):
   ```bash
   curl -s -X POST http://localhost:3000/api/scrape \
     -H "Content-Type: application/json" \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
     -d '{}' | jq
   ```
5. Optional limited run (example — adjust names/ids as chosen):
   ```bash
   curl -s -X POST http://localhost:3000/api/scrape \
     -H "Content-Type: application/json" \
     -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
     -d '{"sourceNames":["BBC","CNN"],"perSourceLimit":3}' | jq
   ```
6. Confirm `401` without the header:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/scrape \
     -H "Content-Type: application/json" -d '{}'
   ```
7. In Supabase Table Editor, verify new `articles` rows have title, image_url, published_at, raw_text, and no homepage/listing URLs.
8. Re-run the same scrape and confirm `duplicatesSkipped` increases and insert count stays low/zero for the same URLs.
9. `GET /api/logs` with admin secret should show scrape start/complete entries.

## Out of scope

- Oxylabs Scheduler sync/process routes
- Vercel Cron / `GET /api/cron/pipeline`
- `POST /api/analyze`
- Homepage/details UI switch from mocks
- pgvector / embeddings
