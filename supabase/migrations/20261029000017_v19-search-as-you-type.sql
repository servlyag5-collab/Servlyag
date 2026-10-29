-- Servly AG v19: search as you type.
-- Home now searches while the customer types, so half-typed words must find listings:
-- "phot" finds the tags "photographer" and "photography", and "wedd" finds "wedding photos".
-- Small spelling mistakes are still forgiven ("photgrapher"), as before (v14).
-- Only the search rules change: no tables, no data. Paste into Supabase > SQL Editor > Run (after v18).

create or replace function public.search_services(p_q text default '', p_city text default '', p_village text default '')
returns setof public.services
language sql stable security invoker set search_path = public, extensions as $$
  with q as (select lower(trim(coalesce(p_q, ''))) as t, lower(trim(coalesce(p_city, ''))) as c, lower(trim(coalesce(p_village, ''))) as v)
  select s.* from public.services s, q
  where s.active
    and (q.c = '' or lower(s.city) like '%' || q.c || '%' or similarity(lower(s.city), q.c) > 0.4)
    and (q.v = '' or lower(coalesce(s.village, '')) like '%' || q.v || '%' or similarity(lower(coalesce(s.village, '')), q.v) > 0.4)
    and (q.t = ''
      or lower(s.title) like '%' || q.t || '%'
      or lower(s.description) like '%' || q.t || '%'
      or word_similarity(q.t, lower(s.title)) > 0.45
      or exists (select 1 from unnest(s.tags) tag, regexp_split_to_table(q.t, '\s+') w
                 where length(w) > 1 and (
                   tag = w or tag = q.t
                   -- New: the start of any word in a tag ("phot" -> "photographer", "wedd" -> "wedding photos").
                   or (' ' || tag) like '% ' || w || '%'
                   or similarity(tag, w) > 0.45)))
  order by s.priority desc, s.created_at desc;
$$;
