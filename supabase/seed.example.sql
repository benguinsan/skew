-- Example only — replace with real homepage URLs stored for scraping.
-- Do not invent production sources in application code.
-- Run in Supabase Dashboard → SQL Editor after schema.sql.
-- Requires unique on sources.listing_url for ON CONFLICT.

-- insert into public.sources (name, listing_url, parser_strategy, is_active, logo_url)
-- values
--   ('Example News', 'https://example.com/', 'generic', true, null)
-- on conflict (listing_url) do nothing;
