-- Seed active news sources (homepage URLs only — not RSS).
-- Requires unique on sources.listing_url (see schema.sql).
-- Safe to re-run: skips rows that already exist.

insert into public.sources (name, listing_url, is_active)
values
  ('BBC', 'https://www.bbc.com/news', true),
  ('CNN', 'https://www.cnn.com', true),
  ('Fox News', 'https://www.foxnews.com', true),
  ('The Guardian', 'https://www.theguardian.com/us', true)
on conflict (listing_url) do nothing;
