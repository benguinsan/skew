-- Revert article_analyses.embedding to vector(1536) for Supabase IVFFlat/HNSW
-- index limits (max 2000 dims). Run in Supabase Dashboard → SQL Editor.
-- Clears existing embeddings — re-run POST /api/analyze with a 1536-dim model after.

drop index if exists public.article_analyses_embedding_ivfflat_idx;

alter table public.article_analyses
  drop column if exists embedding;

alter table public.article_analyses
  add column embedding extensions.vector(1536);

create index if not exists article_analyses_embedding_ivfflat_idx
  on public.article_analyses
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

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

revoke all on function public.match_related_articles(
  extensions.vector,
  uuid,
  int
) from public;

grant execute on function public.match_related_articles(
  extensions.vector,
  uuid,
  int
) to service_role;
