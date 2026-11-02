-- SEARCH RULES REPLACED BY v25 (smart search): run v25 after this; never run v24 again after v25.
-- Servly AG v24: search looks everywhere, and finds related word forms.
--
--   * Searches the listing title, description, tags AND the business name (new).
--   * Finds letters inside words: "clean" finds "cleaning", "housecleaning", "dry-clean".
--   * Word roots: "cleaner", "cleaners", "cleaning" all find each other; "plumber" finds
--     "plumbing", "caterer" finds "catering", "movers" finds "moving", "nails" finds "nail".
--   * Several words ("yard cleaning") find listings that have every word somewhere, in any field.
--   * Small spelling mistakes are still forgiven ("cleening", "photografer").
--   * Order is unchanged: Business first, then Growth, then Starter; newest first within each.
--
-- This REPLACES v21. Do not run v21 after this (it would make search stricter again).
-- Only the search rules change: no tables, no data. Paste into Supabase > SQL Editor > Run (after v23).

------------------------------------------------------------------------------------------------

-- The root of a word, so different forms match: cleaning/cleaner/cleaners -> clean,
-- plumber/plumbing -> plumb, nails -> nail. A root keeps at least 4 letters, so short words are
-- left alone ("ac", "dj", "bus") and "movers" doesn't shrink to "mov" (which would match "remove").
create or replace function public.search_stem(w text) returns text
language sql immutable as $$
  select case
    when length(w) >= 7 and w ~ '(ing|ers)$' then left(w, length(w) - 3)
    when length(w) >= 6 and w ~ '(er|es|ed)$' then left(w, length(w) - 2)
    when length(w) >= 5 and w ~ 's$' and w !~ 'ss$' then left(w, length(w) - 1)
    else w
  end;
$$;

create or replace function public.search_services(p_q text default '', p_city text default '', p_village text default '')
returns setof public.services
language sql stable security invoker set search_path = public, extensions as $$
  with q as (
    select lower(trim(coalesce(p_q, ''))) as t,
           lower(trim(coalesce(p_city, ''))) as c,
           lower(trim(coalesce(p_village, ''))) as v,
           -- each typed word (2+ letters), cut to its root
           array(select public.search_stem(w)
                   from regexp_split_to_table(lower(trim(coalesce(p_q, ''))), '[^[:alnum:]]+') w
                  where length(w) > 1) as words
  )
  select s.* from public.services s
  cross join q
  left join public.profiles p on p.id = s.merchant_id
  -- everything a customer might search for, in one piece of text
  cross join lateral (select lower(s.title || ' ' || coalesce(s.description, '') || ' ' ||
                                   coalesce(p.display_name, '') || ' ' ||
                                   coalesce(array_to_string(s.tags, ' '), '')) as hay) h
  where s.active and not s.paused
    and (q.c = '' or strpos(lower(s.city), q.c) > 0 or similarity(lower(s.city), q.c) > 0.4)
    and (q.v = '' or strpos(lower(coalesce(s.village, '')), q.v) > 0 or similarity(lower(coalesce(s.village, '')), q.v) > 0.4)
    and (q.t = ''
      -- the whole typed text, anywhere
      or strpos(h.hay, q.t) > 0
      -- every typed word (or its root) somewhere in the listing or business name
      or (cardinality(q.words) > 0
          and not exists (select 1 from unnest(q.words) w where strpos(h.hay, w) = 0))
      -- small spelling mistakes
      or word_similarity(q.t, lower(s.title)) > 0.45
      or word_similarity(q.t, lower(coalesce(p.display_name, ''))) > 0.5
      or exists (select 1 from unnest(s.tags) tag, unnest(q.words) w
                  where similarity(lower(tag), w) > 0.45))
  order by s.priority desc, s.created_at desc;
$$;

-- Check: should list the listings that mention cleaning (title, tags, description or business name).
select title from public.search_services('cleaner');
