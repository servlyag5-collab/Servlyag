-- Servly AG v25: smart search (the best of v21 and v24, without their trade-offs).
--
--   * Searches the listing title, description, tags and business name (as v24).
--   * Words of 4+ letters match anywhere, even inside words: "clean" finds "housecleaning",
--     "keeping" finds "housekeeping" (as v24).
--   * Short words (2-3 letters) match only the START of a word: "ac" finds "AC servicing" but not
--     "packages" or "practice"; "dj" finds "DJ hire" (as v21).
--   * Word roots: "cleaner", "cleaners", "cleaning" find each other; "plumber" finds "plumbing".
--   * Spelling mistakes in words of 4+ letters are forgiven: "cleening", "photografer", "plumer".
--   * Several words ("yard cleaning") show listings that have EVERY word. If no listing has them all
--     ("wedding dj"), it shows listings that have ANY of them, so a search is never empty for no reason.
--   * Order is unchanged: Business first, then Growth, then Starter; newest first within each.
--
-- Replaces v21 and v24 (it keeps v24's search_stem). Do not run v21 or v24 after this.
-- Only the search rules change: no tables, no data. Paste into Supabase > SQL Editor > Run (after v24).

------------------------------------------------------------------------------------------------

-- Lower case, anything that isn't a letter or number turned into a space, with a space at each end,
-- so ' ' || word finds the start of any word ("Mobile-AC repairs" -> " mobile ac repairs ").
create or replace function public.search_norm(t text) returns text
language sql immutable as $$
  select ' ' || trim(regexp_replace(lower(coalesce(t, '')), '[^[:alnum:]]+', ' ', 'g')) || ' ';
$$;

-- Does one typed word appear in a listing's text (made by search_norm)?
create or replace function public.search_word_found(hay text, typed text) returns boolean
language sql immutable set search_path = public, extensions as $$
  with w as (select public.search_stem(typed) as root)
  select case when length(w.root) >= 4 then strpos(hay, w.root) > 0   -- 4+ letters: anywhere
              else strpos(hay, ' ' || w.root) > 0                     -- short: start of a word
         end
      or (length(typed) >= 4 and exists (                              -- spelling mistakes
            select 1 from regexp_split_to_table(trim(hay), ' ') x
             where similarity(x, typed) > 0.45 or similarity(x, w.root) > 0.45))
  from w;
$$;

create or replace function public.search_services(p_q text default '', p_city text default '', p_village text default '')
returns setof public.services
language sql stable security invoker set search_path = public, extensions as $$
  with q as (
    select lower(trim(coalesce(p_city, ''))) as c,
           lower(trim(coalesce(p_village, ''))) as v,
           array(select w from regexp_split_to_table(lower(trim(coalesce(p_q, ''))), '[^[:alnum:]]+') w
                  where length(w) > 1) as words
  ),
  m as (
    select s.id,
           cardinality(q.words) as need,
           (select count(*) from unnest(q.words) w where public.search_word_found(h.hay, w)) as hits
    from public.services s
    cross join q
    left join public.profiles p on p.id = s.merchant_id
    cross join lateral (select public.search_norm(s.title || ' ' || coalesce(s.description, '') || ' ' ||
                                                  coalesce(p.display_name, '') || ' ' ||
                                                  coalesce(array_to_string(s.tags, ' '), '')) as hay) h
    where s.active and not s.paused
      and (q.c = '' or strpos(lower(s.city), q.c) > 0 or similarity(lower(s.city), q.c) > 0.4)
      and (q.v = '' or strpos(lower(coalesce(s.village, '')), q.v) > 0 or similarity(lower(coalesce(s.village, '')), q.v) > 0.4)
  )
  select s.* from public.services s
  join m on m.id = s.id
  where m.need = 0                                                   -- nothing typed: show everything
     or m.hits = m.need                                              -- has every word
     or (m.hits > 0 and not exists (select 1 from m m2 where m2.hits = m2.need))  -- none has all: any word
  order by s.priority desc, s.created_at desc;
$$;

-- Check: each line should show the listings described above.
select 'clean' as typed, string_agg(title, ' | ') as finds from public.search_services('clean')
union all select 'ac', string_agg(title, ' | ') from public.search_services('ac')
union all select 'wedding dj', string_agg(title, ' | ') from public.search_services('wedding dj');
