-- Dummy articles + analyses for local UI / query testing.
-- Run AFTER schema.sql and seed.sql.
-- Safe to re-run: skips existing original_url / article_id.

-- ---------------------------------------------------------------------------
-- Articles (analyzed so they can appear on a future live homepage)
-- ---------------------------------------------------------------------------

with src as (
  select id, name from public.sources
  where listing_url in (
    'https://www.bbc.com/news',
    'https://www.cnn.com',
    'https://www.foxnews.com',
    'https://www.theguardian.com/us'
  )
),
rows as (
  select * from (
    values
      (
        'BBC',
        'https://www.bbc.com/news/articles/dummy-peace-talks-001',
        'https://www.bbc.com/news/articles/dummy-peace-talks-001',
        'Leaders Signal Cautious Progress in Regional Peace Talks',
        'https://picsum.photos/seed/skew1/1200/675',
        '2026-07-20T10:00:00Z'::timestamptz,
        'Diplomats from several countries met for a second day of negotiations aimed at reducing regional tensions. Officials described the draft framework as incomplete but useful. Analysts cautioned that verification details remain unresolved and that any agreement would still need domestic political support.',
        '2026-07-20T12:00:00Z'::timestamptz
      ),
      (
        'CNN',
        'https://www.cnn.com/2026/07/21/dummy-central-banks-inflation',
        'https://www.cnn.com/2026/07/21/dummy-central-banks-inflation',
        'Central Banks Hint at Slower Path as Inflation Cool-Down Stalls',
        'https://picsum.photos/seed/skew2/1200/675',
        '2026-07-21T09:30:00Z'::timestamptz,
        'Policy makers signaled they may keep rates higher for longer after fresh data showed sticky services prices. Markets pared expectations for near-term cuts. Economists split on whether the pause reflects temporary noise or a more persistent inflation problem.',
        '2026-07-21T11:00:00Z'::timestamptz
      ),
      (
        'Fox News',
        'https://www.foxnews.com/politics/dummy-border-security-bill-003',
        'https://www.foxnews.com/politics/dummy-border-security-bill-003',
        'Lawmakers Clash Over Border Security Package Ahead of Vote',
        'https://picsum.photos/seed/skew3/1200/675',
        '2026-07-22T14:15:00Z'::timestamptz,
        'House leaders advanced a border security package that expands enforcement funding and tightens asylum processing rules. Supporters called the bill overdue; critics said it underfunds legal pathways and risks court challenges. A final floor vote is expected later this week.',
        '2026-07-22T16:00:00Z'::timestamptz
      ),
      (
        'The Guardian',
        'https://www.theguardian.com/us-news/2026/jul/23/dummy-climate-heat-wave',
        'https://www.theguardian.com/us-news/2026/jul/23/dummy-climate-heat-wave',
        'Record Heat Wave Raises Pressure for Stronger Climate Policy',
        'https://picsum.photos/seed/skew4/1200/675',
        '2026-07-23T08:00:00Z'::timestamptz,
        'A multi-day heat wave pushed temperatures above seasonal norms across several states, straining power grids and public health systems. Scientists linked the intensity to longer-term warming trends. Local officials urged cooling-center use while advocates pressed for faster emissions cuts.',
        '2026-07-23T10:30:00Z'::timestamptz
      ),
      (
        'BBC',
        'https://www.bbc.com/news/articles/dummy-ai-regulation-005',
        'https://www.bbc.com/news/articles/dummy-ai-regulation-005',
        'Tech Firms Face Fresh Scrutiny Over AI Training Data Rules',
        'https://picsum.photos/seed/skew5/1200/675',
        '2026-07-24T11:45:00Z'::timestamptz,
        'Regulators proposed clearer disclosure requirements for how large models are trained. Industry groups warned that broad rules could slow product launches. Consumer advocates argued transparency is needed before wider deployment in public services.',
        '2026-07-24T13:00:00Z'::timestamptz
      ),
      (
        'CNN',
        'https://www.cnn.com/2026/07/25/dummy-space-docking',
        'https://www.cnn.com/2026/07/25/dummy-space-docking',
        'Space Agency Confirms Successful Docking of Supply Mission',
        'https://picsum.photos/seed/skew6/1200/675',
        '2026-07-25T07:20:00Z'::timestamptz,
        'A robotic cargo craft completed docking with the orbital station after a two-day chase. Mission control said all systems looked healthy. The shipment includes science experiments, spare parts, and crew supplies for the coming months.',
        '2026-07-25T09:00:00Z'::timestamptz
      )
  ) as v(
    source_name,
    original_url,
    canonical_url,
    title,
    image_url,
    published_at,
    raw_text,
    analyzed_at
  )
)
insert into public.articles (
  source_id,
  original_url,
  canonical_url,
  title,
  image_url,
  published_at,
  raw_text,
  analyzed_at
)
select
  src.id,
  rows.original_url,
  rows.canonical_url,
  rows.title,
  rows.image_url,
  rows.published_at,
  rows.raw_text,
  rows.analyzed_at
from rows
join src on src.name = rows.source_name
on conflict (original_url) do nothing;

-- ---------------------------------------------------------------------------
-- Analyses (one per dummy article)
-- ---------------------------------------------------------------------------

insert into public.article_analyses (
  article_id,
  summary,
  sentiment_score,
  sentiment_label,
  bias_score,
  bias_label,
  left_percentage,
  center_percentage,
  right_percentage,
  confidence,
  framing_notes,
  loaded_terms,
  disclaimer,
  model
)
select
  a.id,
  x.summary,
  x.sentiment_score,
  x.sentiment_label,
  x.bias_score,
  x.bias_label,
  x.left_percentage,
  x.center_percentage,
  x.right_percentage,
  x.confidence,
  x.framing_notes,
  x.loaded_terms,
  x.disclaimer,
  x.model
from public.articles a
join (
  values
    (
      'https://www.bbc.com/news/articles/dummy-peace-talks-001',
      'Diplomats reported cautious progress in regional peace talks while verification details remain open. Coverage emphasizes process and unresolved security guarantees.',
      -0.05::numeric,
      'neutral',
      0.05::numeric,
      'center',
      22,
      51,
      27,
      0.71::numeric,
      'AI-estimated framing based on emphasis on negotiation process and balanced sourcing. Not objective truth.',
      array['negotiations', 'framework', 'verification'],
      'AI summaries can make mistakes. Check important information against the original reporting.',
      'dummy-seed'
    ),
    (
      'https://www.cnn.com/2026/07/21/dummy-central-banks-inflation',
      'Central banks signaled a slower easing path after sticky inflation data. Markets reduced near-term rate-cut bets.',
      -0.18::numeric,
      'negative',
      0.12::numeric,
      'right',
      20,
      36,
      44,
      0.68::numeric,
      'AI-estimated framing leans toward policy hawkishness and market caution language.',
      array['inflation', 'rates', 'sticky'],
      'AI summaries can make mistakes. Check important information against the original reporting.',
      'dummy-seed'
    ),
    (
      'https://www.foxnews.com/politics/dummy-border-security-bill-003',
      'A border security package advanced amid sharp partisan disagreement over enforcement and asylum rules.',
      -0.10::numeric,
      'neutral',
      0.34::numeric,
      'right',
      18,
      30,
      52,
      0.74::numeric,
      'AI-estimated framing reflects stronger emphasis on enforcement and security framing in the saved text.',
      array['enforcement', 'asylum', 'security'],
      'AI summaries can make mistakes. Check important information against the original reporting.',
      'dummy-seed'
    ),
    (
      'https://www.theguardian.com/us-news/2026/jul/23/dummy-climate-heat-wave',
      'Extreme heat intensified calls for stronger climate policy while cities managed public-health strain.',
      -0.22::numeric,
      'negative',
      -0.28::numeric,
      'left',
      48,
      32,
      20,
      0.77::numeric,
      'AI-estimated framing emphasizes climate urgency and policy response language.',
      array['heat wave', 'emissions', 'warming'],
      'AI summaries can make mistakes. Check important information against the original reporting.',
      'dummy-seed'
    ),
    (
      'https://www.bbc.com/news/articles/dummy-ai-regulation-005',
      'Proposed AI disclosure rules split industry groups and consumer advocates over transparency versus speed.',
      0.02::numeric,
      'neutral',
      -0.08::numeric,
      'mixed',
      38,
      34,
      28,
      0.66::numeric,
      'AI-estimated framing is mixed: competing emphasis on regulation and innovation risk.',
      array['disclosure', 'training data', 'transparency'],
      'AI summaries can make mistakes. Check important information against the original reporting.',
      'dummy-seed'
    ),
    (
      'https://www.cnn.com/2026/07/25/dummy-space-docking',
      'A cargo craft successfully docked with the orbital station, delivering experiments and crew supplies.',
      0.35::numeric,
      'positive',
      0.02::numeric,
      'center',
      16,
      66,
      18,
      0.80::numeric,
      'AI-estimated framing is largely procedural and event-focused with limited political language.',
      array['docking', 'mission', 'supplies'],
      'AI summaries can make mistakes. Check important information against the original reporting.',
      'dummy-seed'
    )
) as x(
  original_url,
  summary,
  sentiment_score,
  sentiment_label,
  bias_score,
  bias_label,
  left_percentage,
  center_percentage,
  right_percentage,
  confidence,
  framing_notes,
  loaded_terms,
  disclaimer,
  model
) on a.original_url = x.original_url
on conflict (article_id) do nothing;
