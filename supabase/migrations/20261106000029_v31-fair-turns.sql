-- Servly AG v31: Business plan first, and everyone in a plan takes turns at the front (owner's rule, 2026-11-06).
-- Run AFTER v30. It changes only the ORDER of search results and suggestions; which listings match is the same
-- as v30 (word roots, spelling mistakes, business names, description-only matches dropped, ...).
--
--   * Results: a business-name search still shows that business first. Otherwise Business plan listings come
--     first, then Growth, then Starter. Inside each plan the order rotates every 30 minutes, so every listing
--     gets turns at the front (before, the newest listing was always first). Everyone searching in the same
--     half hour sees the same order, so nothing jumps around while someone is browsing.
--   * Suggestions under the search box (3 business spots): businesses whose name OR listings match (v30 used
--     the name only, so a Business plan photographer never showed for "photo"). A business whose name was typed comes first.
--     Then 2 spots for the highest plan that matches, and 1 spot shared by all the other plans in turn
--     (so Growth and Starter businesses get seen too). All rotating every 30 minutes.
--   * To change how often it rotates: change 30 in search_turn_minutes() below and run just that function.
--
-- No tables, no data. Paste into Supabase > SQL Editor > Run.

-- How often the order turns, in minutes.
create or replace function public.search_turn_minutes() returns int
language sql immutable as $$ select 30 $$;

-- A listing's (or business's) place in the queue for the current half hour: the same for everyone during
-- that half hour, different in the next one. md5 mixes the id with the half-hour number.
create or replace function public.search_turn(p_id uuid) returns text
language sql stable as $$
  select md5(p_id::text || ':' || floor(extract(epoch from now()) / (60 * public.search_turn_minutes()))::text);
$$;
grant execute on function public.search_turn_minutes() to anon, authenticated;
grant execute on function public.search_turn(uuid) to anon, authenticated;

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
              or similarity(b.name_t, b.phrase) >= 0.6)) as name_match
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
  order by f.name_match desc,                -- the business whose name was typed
           s.priority desc,                  -- then Business, Growth, Starter
           public.search_turn(s.id),         -- then taking turns, changing every 30 minutes
           s.id;                             -- (fixed order inside a half hour, so paging never repeats or skips)
$$;

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
           max(l.priority) as pr,
           public.search_turn(p.id) as turn,
           -- Their name was typed: most of it at the start of a word, or the whole name with a small mistake.
           (length(q.phrase) >= 4 and (
              (strpos(public.search_norm(p.display_name), ' ' || q.phrase) > 0
                 and length(q.phrase) * 2 >= length(trim(public.search_norm(p.display_name))))
              or similarity(trim(public.search_norm(p.display_name)), q.phrase) >= 0.6)) as named
    from public.profiles p
    join live l on l.merchant_id = p.id
    cross join q
    where cardinality(q.words) > 0 and coalesce(trim(p.display_name), '') <> ''
    group by p.id, p.display_name, q.phrase, q.words
    -- The business's name matches, or one of its listings matches in its title or tags (new in v31, so a
    -- Business plan photographer is suggested for "photo" even when "photo" isn't in the business name).
    having public.search_hits(public.search_norm(p.display_name), q.words) = cardinality(q.words)
        or similarity(trim(public.search_norm(p.display_name)), q.phrase) > 0.4
        or bool_or(public.search_hits(public.search_norm(l.title) || public.search_norm(array_to_string(l.tags, ' ')), q.words) = cardinality(q.words))
  ),
  plans as (select b.*, b.pr = max(b.pr) over () as top_plan from biz b),
  ranked as (
    select x.*, row_number() over (partition by x.top_plan order by x.turn, x.id) as place
    from plans x
  ),
  svc as (
    select distinct on (lower(l.title)) l.title, similarity(lower(l.title), q.phrase) as sim, l.priority as pr
    from live l cross join q
    where cardinality(q.words) > 0
      and public.search_hits(public.search_norm(l.title) || public.search_norm(array_to_string(l.tags, ' ')), q.words) = cardinality(q.words)
    order by lower(l.title), l.priority desc
  )
  (select 'business'::text, r.display_name, r.id, case when r.n = 1 then r.one end
     from ranked r
     order by r.named desc,                                     -- a business whose name was typed
              case when r.top_plan and r.place <= 2 then 0      -- 2 spots: the highest plan that matches
                   when not r.top_plan then 1                   -- 1 spot: everyone else, taking turns
                   else 2 end,                                  -- (more of the top plan if nobody else matches)
              r.turn, r.id
     limit 3)
  union all
  (select 'service'::text, s.title, null::uuid, null::uuid
     from svc s order by s.sim desc, s.pr desc limit 3);
$$;
grant execute on function public.search_suggestions(text) to anon, authenticated;
