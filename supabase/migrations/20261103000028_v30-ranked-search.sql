-- Servly AG v30: search like the big service apps (best match first, suggestions while you type).
-- This REPLACES the search from v19, v21, v24 and v25. After running it, never run any of those again.
-- It also re-creates the word helpers from v24/v25, so it works on its own.
--
--   * Best match first: a listing whose BUSINESS NAME or TITLE matches what was typed comes first, then tags,
--     then the description. The plan (Business, Growth, Starter) only breaks ties between equal matches.
--   * A business name search stays narrow: typing most of a business's name ("swift island", "yonnie j photo")
--     shows only that business's listings.
--   * Description-only matches are dropped when other listings match in their name, title or tags
--     (so a word like "events" in a description no longer pulls in unrelated listings).
--   * Kept from v25: word roots (cleaner/cleaning -> clean, plumber -> plumb), forgiving small spelling
--     mistakes in 4+ letter words, short words ("ac", "dj") only match the start of a word, and when no listing
--     has every word, listings with any of the words show.
--   * NEW search_suggestions(): up to 3 businesses and 3 services for the list under the search box.
--
-- Only the search rules change: no tables, no data. Paste into Supabase > SQL Editor > Run (after v29).

-- Word roots (same as v24).
create or replace function public.search_stem(w text) returns text
language sql immutable as $$
  select case
    when length(w) >= 7 and w ~ '(ing|ers)$' then left(w, length(w) - 3)
    when length(w) >= 6 and w ~ '(er|es|ed)$' then left(w, length(w) - 2)
    when length(w) >= 5 and w ~ 's$' and w !~ 'ss$' then left(w, length(w) - 1)
    else w
  end;
$$;

-- Lower case, punctuation turned into spaces, a space at both ends (same as v25).
create or replace function public.search_norm(t text) returns text
language sql immutable as $$
  select ' ' || trim(regexp_replace(lower(coalesce(t, '')), '[^[:alnum:]]+', ' ', 'g')) || ' ';
$$;

-- Does one typed word appear in a text made by search_norm? (same as v25)
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

-- How many of the typed words appear in a text.
create or replace function public.search_hits(hay text, words text[]) returns int
language sql immutable set search_path = public, extensions as $$
  select count(*)::int from unnest(words) w where public.search_word_found(hay, w);
$$;

create or replace function public.search_services(p_q text default '', p_city text default '', p_village text default '')
returns setof public.services
language sql stable security invoker set search_path = public, extensions as $$
  with q as (
    select lower(trim(coalesce(p_city, ''))) as c,
           lower(trim(coalesce(p_village, ''))) as v,
           trim(public.search_norm(p_q)) as phrase,
           array(select w from regexp_split_to_table(lower(trim(coalesce(p_q, ''))), '[^[:alnum:]]+') w
                  where length(w) > 1) as words
  ),
  b as (
    select s.id, q.words, q.phrase,
           cardinality(q.words) as need,
           public.search_norm(p.display_name) as name_h,
           public.search_norm(s.title) as title_h,
           public.search_norm(array_to_string(s.tags, ' ')) as tag_h,
           public.search_norm(s.description) as desc_h,
           trim(public.search_norm(p.display_name)) as name_t
    from public.services s
    cross join q
    left join public.profiles p on p.id = s.merchant_id
    where s.active and not s.paused
      and (q.c = '' or strpos(lower(s.city), q.c) > 0 or similarity(lower(s.city), q.c) > 0.4)
      and (q.v = '' or strpos(lower(coalesce(s.village, '')), q.v) > 0 or similarity(lower(coalesce(s.village, '')), q.v) > 0.4)
  ),
  m as (
    select b.id, b.need,
           public.search_hits(b.name_h || b.title_h || b.tag_h || b.desc_h, b.words) as hits_all,
           public.search_hits(b.name_h || b.title_h || b.tag_h, b.words) as hits_main,
           -- Most of a business's name typed (at the start of a word in it), or the whole name with a small mistake.
           (b.need > 0 and length(b.phrase) >= 4 and (
              (strpos(b.name_h, ' ' || b.phrase) > 0 and (length(b.phrase) * 2 >= length(b.name_t) or (cardinality(b.words) >= 2 and length(b.phrase) >= 6)))
              or similarity(b.name_t, b.phrase) >= 0.6)) as name_match,
           -- Relevance: name and title count most, then tags, then the description.
           10 * public.search_hits(b.name_h, b.words)
             + 10 * public.search_hits(b.title_h, b.words)
             + 5 * public.search_hits(b.tag_h, b.words)
             + public.search_hits(b.desc_h, b.words)
             + case when b.need > 0 and strpos(b.title_h, ' ' || b.phrase || ' ') > 0 then 40
                    when b.need > 0 and length(b.phrase) >= 3 and strpos(b.title_h, ' ' || b.phrase) > 0 then 30 else 0 end
             as score
    from b
  ),
  f as (
    select m.*,
           bool_or(m.name_match) over () as any_name,
           bool_or(m.need > 0 and m.hits_main = m.need) over () as any_main,
           bool_or(m.need > 0 and m.hits_all = m.need) over () as any_all
    from m
  )
  select s.* from public.services s
  join f on f.id = s.id
  where f.need = 0                                                          -- nothing typed: everything
     or (f.any_name and f.name_match)                                       -- a business name: only that business
     or (not f.any_name and f.hits_main = f.need)                           -- every word in name, title or tags
     or (not f.any_name and not f.any_main and f.hits_all = f.need)         -- else every word anywhere
     or (not f.any_name and not f.any_all and f.hits_all > 0)               -- else any word
  order by (case when f.name_match then 100 else 0 end) + f.score desc, s.priority desc, s.created_at desc;
$$;

-- The list under the search box: up to 3 businesses (tap = open it) and 3 services (tap = search for it).
-- Only live listings of businesses with a paid-up plan (the usual visibility rules apply: security invoker).
create or replace function public.search_suggestions(p_q text)
returns table (kind text, label text, merchant_id uuid, service_id uuid)
language sql stable security invoker set search_path = public, extensions as $$
  with q as (
    select trim(public.search_norm(p_q)) as phrase,
           array(select w from regexp_split_to_table(lower(trim(coalesce(p_q, ''))), '[^[:alnum:]]+') w
                  where length(w) > 1) as words
  ),
  live as (select s.* from public.services s where s.active and not s.paused),
  biz as (
    select p.id, p.display_name,
           count(l.id) as n, (array_agg(l.id order by l.created_at))[1] as one,
           similarity(trim(public.search_norm(p.display_name)), q.phrase) as sim, max(l.priority) as pr
    from public.profiles p
    join live l on l.merchant_id = p.id
    cross join q
    where cardinality(q.words) > 0 and coalesce(trim(p.display_name), '') <> ''
      and (public.search_hits(public.search_norm(p.display_name), q.words) = cardinality(q.words)
           or similarity(trim(public.search_norm(p.display_name)), q.phrase) > 0.4)
    group by p.id, p.display_name, q.phrase
  ),
  svc as (
    select distinct on (lower(l.title)) l.title, similarity(lower(l.title), q.phrase) as sim, l.priority as pr
    from live l cross join q
    where cardinality(q.words) > 0
      and public.search_hits(public.search_norm(l.title) || public.search_norm(array_to_string(l.tags, ' ')), q.words) = cardinality(q.words)
    order by lower(l.title), l.priority desc
  )
  (select 'business'::text, b.display_name, b.id, case when b.n = 1 then b.one end
     from biz b order by b.sim desc, b.pr desc limit 3)
  union all
  (select 'service'::text, s.title, null::uuid, null::uuid
     from svc s order by s.sim desc, s.pr desc limit 3);
$$;
grant execute on function public.search_suggestions(text) to anon, authenticated;

