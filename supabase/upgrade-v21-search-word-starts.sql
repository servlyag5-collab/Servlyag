-- Servly AG v21: search matches the START of words, not letters hidden inside them.
-- Before: "ac" found "packing", "packages" and "practice" (the letters a-c inside those words).
-- Now: "ac" finds "AC servicing", "AC installation"; "phot" still finds "photographer";
-- "wedding pho" still finds "wedding photos". Small spelling mistakes are still forgiven.
-- Only the search rules change: no tables, no data. Paste into Supabase > SQL Editor > Run (after v20).

-- Lower case, with anything that isn't a letter or number turned into a space, and a space in front,
-- so "% word" finds the start of any word ("Mobile-AC repairs" -> " mobile ac repairs").
create or replace function public.search_words(p text) returns text
language sql immutable set search_path = public as $$
  select ' ' || trim(regexp_replace(lower(coalesce(p, '')), '[^[:alnum:]]+', ' ', 'g'));
$$;

create or replace function public.search_services(p_q text default '', p_city text default '', p_village text default '')
returns setof public.services
language sql stable security invoker set search_path = public, extensions as $$
  with q as (select lower(trim(coalesce(p_q, ''))) as t, trim(public.search_words(p_q)) as w,
                    lower(trim(coalesce(p_city, ''))) as c, lower(trim(coalesce(p_village, ''))) as v)
  select s.* from public.services s, q
  where s.active and not s.paused
    and (q.c = '' or lower(s.city) like '%' || q.c || '%' or similarity(lower(s.city), q.c) > 0.4)
    and (q.v = '' or lower(coalesce(s.village, '')) like '%' || q.v || '%' or similarity(lower(coalesce(s.village, '')), q.v) > 0.4)
    and (q.w = ''
      -- the words typed, at the start of a word in the name, description or a tag
      or public.search_words(s.title) like '% ' || q.w || '%'
      or public.search_words(s.description) like '% ' || q.w || '%'
      or public.search_words(array_to_string(s.tags, ' , ')) like '% ' || q.w || '%'
      -- small spelling mistakes ("photgrapher", "plumbr")
      or word_similarity(q.t, lower(s.title)) > 0.45
      or exists (select 1 from unnest(s.tags) tag, regexp_split_to_table(q.w, '\s+') w
                 where length(w) > 2 and similarity(tag, w) > 0.45))
  order by s.priority desc, s.created_at desc;
$$;

-- Check: "ac" should no longer find moving, decor or tutoring listings.
select title from public.search_services('ac', '', '');
