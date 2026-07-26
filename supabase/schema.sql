-- biasly / Skew News — canonical schema
-- Apply in Supabase Dashboard → SQL Editor.
-- No pgvector / embedding column yet (added after AI analysis).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  listing_url text not null unique,
  parser_strategy text,
  is_active boolean not null default true,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete restrict,
  original_url text not null,
  canonical_url text,
  title text not null,
  image_url text not null,
  published_at timestamptz not null,
  raw_text text not null,
  scraped_at timestamptz not null default now(),
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint articles_original_url_key unique (original_url)
);

create unique index articles_canonical_url_key
  on public.articles (canonical_url)
  where canonical_url is not null;

create index articles_source_id_idx on public.articles (source_id);
create index articles_analyzed_at_idx on public.articles (analyzed_at);
create index articles_published_at_desc_idx on public.articles (published_at desc);

create table public.article_analyses (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null unique references public.articles (id) on delete cascade,
  summary text not null,
  sentiment_score numeric not null,
  sentiment_label text not null,
  bias_score numeric not null,
  bias_label text not null,
  left_percentage integer not null,
  center_percentage integer not null,
  right_percentage integer not null,
  confidence numeric not null,
  framing_notes text not null,
  loaded_terms text[] not null default '{}',
  disclaimer text not null,
  model text not null,
  created_at timestamptz not null default now(),
  constraint article_analyses_sentiment_score_range
    check (sentiment_score >= -1 and sentiment_score <= 1),
  constraint article_analyses_bias_score_range
    check (bias_score >= -1 and bias_score <= 1),
  constraint article_analyses_confidence_range
    check (confidence >= 0 and confidence <= 1),
  constraint article_analyses_left_percentage_range
    check (left_percentage >= 0 and left_percentage <= 100),
  constraint article_analyses_center_percentage_range
    check (center_percentage >= 0 and center_percentage <= 100),
  constraint article_analyses_right_percentage_range
    check (right_percentage >= 0 and right_percentage <= 100),
  constraint article_analyses_percentages_sum
    check (left_percentage + center_percentage + right_percentage = 100),
  constraint article_analyses_sentiment_label_check
    check (sentiment_label in ('positive', 'neutral', 'negative')),
  constraint article_analyses_bias_label_check
    check (bias_label in ('left', 'center', 'right', 'mixed', 'unclear'))
);

create table public.logs (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint logs_level_check check (level in ('info', 'warn', 'error'))
);

create index logs_created_at_desc_idx on public.logs (created_at desc);

create table public.oxylabs_schedules (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null unique references public.sources (id) on delete restrict,
  -- Store as text: Oxylabs schedule IDs exceed JS Number.MAX_SAFE_INTEGER.
  oxylabs_schedule_id text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.oxylabs_schedule_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.oxylabs_schedules (id) on delete cascade,
  -- Store as text: Oxylabs job IDs exceed JS Number.MAX_SAFE_INTEGER.
  oxylabs_job_id text not null,
  result_status text not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint oxylabs_schedule_runs_schedule_job_key unique (schedule_id, oxylabs_job_id),
  constraint oxylabs_schedule_runs_result_status_check
    check (result_status in ('done', 'pending', 'faulted'))
);

create index oxylabs_schedule_runs_result_status_idx
  on public.oxylabs_schedule_runs (result_status);
create index oxylabs_schedule_runs_processed_at_idx
  on public.oxylabs_schedule_runs (processed_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.article_analyses enable row level security;
alter table public.logs enable row level security;
alter table public.oxylabs_schedules enable row level security;
alter table public.oxylabs_schedule_runs enable row level security;

-- Public catalog: active sources only
create policy "anon_authenticated_select_active_sources"
  on public.sources
  for select
  to anon, authenticated
  using (is_active = true);

-- Public feed: analyzed articles only
create policy "anon_authenticated_select_analyzed_articles"
  on public.articles
  for select
  to anon, authenticated
  using (analyzed_at is not null);

-- Analyses for analyzed articles
create policy "anon_authenticated_select_analyses_for_analyzed_articles"
  on public.article_analyses
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.articles a
      where a.id = article_analyses.article_id
        and a.analyzed_at is not null
    )
  );

-- logs / oxylabs_*: no anon/authenticated policies (service_role only)

-- ---------------------------------------------------------------------------
-- Explicit Data API grants (required — tables are not auto-exposed)
-- ---------------------------------------------------------------------------

grant select on public.sources to anon, authenticated;
grant select on public.articles to anon, authenticated;
grant select on public.article_analyses to anon, authenticated;

grant select, insert, update, delete on public.sources to service_role;
grant select, insert, update, delete on public.articles to service_role;
grant select, insert, update, delete on public.article_analyses to service_role;
grant select, insert, update, delete on public.logs to service_role;
grant select, insert, update, delete on public.oxylabs_schedules to service_role;
grant select, insert, update, delete on public.oxylabs_schedule_runs to service_role;
