-- Servly AG v17: at most 10 search tags per listing.
-- The app already stops merchants saving more than 10 (see src/lib/tags.ts). This rule makes the
-- database refuse it too, so nobody can get around the app.
-- Paste into Supabase > SQL Editor > Run (after v16). No listings are deleted.

-- 1. Any listing that already has more than 10 tags keeps its first 10.
update public.services set tags = tags[1:10] where cardinality(tags) > 10;

-- 2. From now on, a listing can't be saved with more than 10 tags.
alter table public.services add constraint services_max_10_tags check (cardinality(tags) <= 10);

-- Check: the largest number of tags on any listing (should be 10 or less).
select coalesce(max(cardinality(tags)), 0) as most_tags_on_a_listing from public.services;
