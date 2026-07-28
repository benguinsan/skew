-- Seed active news sources (homepage URLs only — not RSS).
-- Requires unique on sources.listing_url (see schema.sql).
-- Safe to re-run: skips rows that already exist.

insert into public.sources (name, listing_url, parser_strategy, is_active)
values
  ('BBC', 'https://www.bbc.com/news', 'bbc', true),
  ('CNN', 'https://www.cnn.com', 'cnn', true),
  ('Fox News', 'https://www.foxnews.com', 'fox', true),
  ('The Guardian', 'https://www.theguardian.com/us', 'guardian', true)
on conflict (listing_url) do nothing;

-- Optional: set strategies on existing rows (safe to re-run)
update public.sources set parser_strategy = 'bbc' where listing_url = 'https://www.bbc.com/news' and parser_strategy is null;
update public.sources set parser_strategy = 'cnn' where listing_url = 'https://www.cnn.com' and parser_strategy is null;
update public.sources set parser_strategy = 'fox' where listing_url = 'https://www.foxnews.com' and parser_strategy is null;
update public.sources set parser_strategy = 'guardian' where listing_url = 'https://www.theguardian.com/us' and parser_strategy is null;
