# biasly (Skew)

AI-powered news analysis app. Collect articles from configured sources, analyze framing and sentiment with AI, store results in Supabase, and show reader-friendly insights on a minimal web UI.

## What it does

- **Home** — news cards with sentiment, AI-estimated political framing (left / center / right %), and confidence
- **Article details** — full analysis (summary, framing notes, loaded terms, disclaimer) plus **Related Stories** via pgvector cosine similarity
- **Auth** — Clerk sign-in / sign-up
- **Pipeline (manual)** — scrape source homepages → validate articles → AI analysis + embeddings → persist to Supabase

UI only **displays stored data**. Scraping, AI, and DB writes run on the server (API routes + service role).

## Stack

| Layer | Tech |
| ----- | ---- |
| App | Next.js (App Router), TypeScript, Tailwind CSS, shadcn-style UI |
| Auth | Clerk |
| Database | Supabase (Postgres + RLS + pgvector) |
| Scraping | Oxylabs Web Scraper API + Cheerio parsing |
| AI | Vercel AI SDK + OpenRouter (analysis + embeddings) |
| Analytics | PostHog (optional client) |
| Quality | ESLint, Prettier, `tsc`, GitHub Actions CI |
| Run / deploy (dev) | **Docker Compose** — app on port **5173** |

## Architecture (high level)

```
Sources (Supabase)
    → Oxylabs scrape homepage / article HTML
    → Parse & validate (Cheerio)
    → articles (append-only, URL dedupe)
    → OpenRouter analysis + embedding
    → article_analyses (+ vector)
    → Home / Details UI (+ related via RPC)
```

Layers stay separate: **Website** · **API** · **DB** · **Scraping** · **Parsing** · **AI** · **Pipeline**.

## Current status

**Done**

- Home + news details UI
- Clerk authentication
- Supabase schema, queries, RLS
- Manual scrape (`POST /api/scrape`)
- Manual AI analysis + embeddings (`POST /api/analyze`)
- Related articles (pgvector, 1536-dim)
- CI (typecheck, lint, format, build, Docker image build)

**Not done / paused**

- Oxylabs Scheduler + Vercel Cron hourly pipeline (AGENTS §18)
- Continuous CD / production deploy (planned next)
- Running scrape/analyze continuously (optional for a small personal project — costs Oxylabs + OpenRouter)

## Getting started

Primary workflow for this project is **Docker** (not `npm run dev` on the host). The app listens on **http://localhost:5173**.

### Prerequisites

- Docker + Docker Compose
- A Supabase project
- Clerk application
- Oxylabs Web Scraper API credentials (for scrape)
- OpenRouter API key (for analysis + embeddings)

### 1. Environment

```bash
cp .env.example .env.local
# Fill in values — see Environment below
# compose.yaml loads .env.local into the container
```

### 2. Database

Apply schema in Supabase **SQL Editor**:

1. Run `supabase/schema.sql` (greenfield), **or**
2. For an existing DB adding pgvector: `supabase/alter-pgvector.sql`
3. If you ever created `vector(2048)`, use `supabase/alter-embedding-1536.sql` (Supabase IVFFlat indexes cap at 2000 dims)

Details: [`supabase/README.md`](supabase/README.md). Seed sources from `supabase/seed.example.sql` (do not hardcode source URLs in app code).

### 3. Run with Docker

```bash
docker compose up --build
```

Open [http://localhost:5173](http://localhost:5173).

Useful variants:

```bash
# Detached
docker compose up -d --build

# Rebuild without cache, then start
docker compose down --rmi local --remove-orphans \
  && docker compose build --no-cache \
  && docker compose up -d
```

Compose maps host **5173 → container 5173**, bind-mounts the repo for live reload, and keeps `node_modules` / `.next` as container volumes. More detail: [`README.Docker.md`](README.Docker.md).

Host `npm run dev` (port 3000) is optional for quick checks only; day-to-day development follows Docker.
## Environment

Canonical list: [`.env.example`](.env.example). Only `NEXT_PUBLIC_*` may reach the browser.

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_CLERK_*` / `CLERK_SECRET_KEY` | Auth |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | DB (service role = server only) |
| `OXY_WSA_USERNAME` / `OXY_WSA_PASSWORD` | Oxylabs scrape |
| `BIASLY_ADMIN_SECRET` | Protects mutating API routes (`x-biasly-admin-secret`) |
| `OPENROUTER_API_KEY` | Analysis + embeddings |
| `OPENROUTER_ANALYSIS_MODEL` | Chat model id (e.g. free or paid OpenRouter models) |
| `OPENROUTER_EMBEDDING_MODEL` | Default `openai/text-embedding-3-small` (1536 dims) |
| `NEXT_PUBLIC_POSTHOG_*` | Optional analytics |
| `CRON_SECRET` | Vercel Cron only — do **not** put in `.env.local` |

Never expose service role, Oxylabs, OpenRouter, or admin secrets to client code.

## Scripts

Used in CI and optionally on the host (Node 22). Prefer Docker for running the app.

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # ESLint
npm run format:check  # Prettier check
npm run format        # Prettier write
npm run build         # Production build (CI)
npm run dev           # Host-only Next.js (port 3000) — not the default workflow
npm run start         # Serve production build on host
```

CI runs quality checks on `main` (see `.github/workflows/ci.yml`), including a Docker image build.

## Manual pipeline (admin)

Requires header `x-biasly-admin-secret: $BIASLY_ADMIN_SECRET`. With Docker up, hit **port 5173**. Watch `docker compose logs -f` for scrape/analyze progress.

```bash
# Scrape active sources (default: all active, up to 5 valid articles per source)
curl -s -X POST 'http://localhost:5173/api/scrape' \
  -H 'content-type: application/json' \
  -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
  -d '{}'

# Analyze pending articles + generate embeddings
curl -s -X POST 'http://localhost:5173/api/analyze' \
  -H 'content-type: application/json' \
  -H "x-biasly-admin-secret: $BIASLY_ADMIN_SECRET" \
  -d '{}'
```

Other read routes: `GET /api/sources`, `GET /api/logs` (same base URL).
## Project layout

```
app/                 # Pages + API routes
components/          # UI (news cards, details, layout)
lib/
  ai/                # OpenRouter analysis + embeddings
  oxylabs/           # Scraper client
  parsing/           # Homepage / article HTML parsing
  pipeline/          # Scrape & analyze orchestration
  supabase/          # Clients, types, queries
supabase/            # schema.sql + alter scripts
prompts/             # Implementation prompts (agent workflow)
AGENTS.md            # Product rules & architecture source of truth
```

## Docs & conventions

- **`AGENTS.md`** — product scope, pipeline rules, security, env table
- **`prompts/`** — feature implementation prompts used before coding
- **`supabase/README.md`** — how to apply schema / pgvector

## License

Private project (`private: true` in `package.json`).
