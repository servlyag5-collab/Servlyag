-- Servly AG v39: search insights for the owner (owner's choice, 2026-11-16). Admin > Searches shows what people
-- search for, ranked, and above all what they searched for and did NOT find (businesses to sign up, or to market to).
--
--   * search_log: one row per FINISHED search (Search pressed, or the words left unchanged for a moment): the words,
--     parish, village, and how many results came up (0 = nothing found; 30 means "30 or more").
--   * NEVER who searched: no account, name, phone or device is stored. Searches that look like a phone number or an
--     email address are not stored at all. Privacy Policy: "What people search for" line.
--   * Rows older than 12 months are deleted every night (pg_cron "servly-search-log-cleanup", 03:15 UTC).
--   * Nobody can read the log from the app or website; admins see only the ranked lists (admin_* functions below).
--
-- Paste into Supabase > SQL Editor > Run (after v38). Searches start counting once the app update reaches people.

begin;

create table if not exists public.search_log (
  id bigint generated always as identity primary key,
  q text not null default '',          -- the words, lower case, single spaces ('' = only a parish/village)
  city text not null default '',
  village text not null default '',
  results int not null default 0 check (results >= 0),
  created_at timestamptz not null default now()
);
create index if not exists search_log_when on public.search_log (created_at desc);
create index if not exists search_log_q on public.search_log (q, created_at desc);
alter table public.search_log enable row level security;   -- no policies: nobody reads rows directly
revoke all on public.search_log from anon, authenticated;

-- The app records a finished search. Silently skips empty searches, contact details, and floods.
create or replace function public.log_search(p_q text, p_city text, p_village text, p_results int)
returns void language plpgsql security definer set search_path = public as $$
declare q text := left(lower(regexp_replace(trim(coalesce(p_q, '')), '\s+', ' ', 'g')), 80);
        c text := left(trim(coalesce(p_city, '')), 60);
        v text := left(trim(coalesce(p_village, '')), 60);
begin
  if q = '' and c = '' and v = '' then return; end if;
  if q like '%@%' or length(regexp_replace(q, '\D', '', 'g')) >= 7 then return; end if;   -- looks like an email or phone
  if (select count(*) from public.search_log where created_at > now() - interval '1 minute') > 300 then return; end if;
  insert into public.search_log (q, city, village, results) values (q, c, v, greatest(coalesce(p_results, 0), 0));
end $$;
revoke all on function public.log_search(text, text, text, int) from public;
grant execute on function public.log_search(text, text, text, int) to anon, authenticated;

-- Top searches in the last p_days days: how often, how often nothing was found, and when last.
create or replace function public.admin_top_searches(p_days int default 30, p_limit int default 50)
returns table (q text, searches bigint, no_results bigint, last_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
  select s.q, count(*), count(*) filter (where s.results = 0), max(s.created_at)
    from public.search_log s
   where s.q <> '' and s.created_at > now() - make_interval(days => greatest(p_days, 1))
   group by s.q order by count(*) desc, max(s.created_at) desc limit greatest(p_limit, 1);
end $$;

-- Searched for but nothing found: the gaps to fill (with where people searched).
create or replace function public.admin_unmet_searches(p_days int default 30, p_limit int default 50)
returns table (q text, place text, searches bigint, last_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
  select s.q, coalesce(nullif(concat_ws(', ', nullif(s.village, ''), nullif(s.city, '')), ''), 'Anywhere'),
         count(*), max(s.created_at)
    from public.search_log s
   where s.results = 0 and s.created_at > now() - make_interval(days => greatest(p_days, 1))
   group by 1, 2 order by count(*) desc, max(s.created_at) desc limit greatest(p_limit, 1);
end $$;

-- Where people search (parish/village picked in the search), with how often nothing was found.
create or replace function public.admin_search_places(p_days int default 30)
returns table (place text, searches bigint, no_results bigint)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
  select coalesce(nullif(s.village, ''), nullif(s.city, ''), 'Anywhere'), count(*), count(*) filter (where s.results = 0)
    from public.search_log s
   where s.created_at > now() - make_interval(days => greatest(p_days, 1))
   group by 1 order by count(*) desc limit 30;
end $$;

-- Rising: searches this week compared with the week before (new ones count as rising).
create or replace function public.admin_rising_searches(p_limit int default 20)
returns table (q text, this_week bigint, last_week bigint)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
  select s.q, count(*) filter (where s.created_at > now() - interval '7 days'),
         count(*) filter (where s.created_at <= now() - interval '7 days')
    from public.search_log s
   where s.q <> '' and s.created_at > now() - interval '14 days'
   group by s.q
  having count(*) filter (where s.created_at > now() - interval '7 days') >= 3
     and count(*) filter (where s.created_at > now() - interval '7 days')
         > 1.5 * count(*) filter (where s.created_at <= now() - interval '7 days')
   order by 2 desc limit greatest(p_limit, 1);
end $$;

revoke all on function public.admin_top_searches(int, int) from public, anon;
revoke all on function public.admin_unmet_searches(int, int) from public, anon;
revoke all on function public.admin_search_places(int) from public, anon;
revoke all on function public.admin_rising_searches(int) from public, anon;
grant execute on function public.admin_top_searches(int, int) to authenticated;
grant execute on function public.admin_unmet_searches(int, int) to authenticated;
grant execute on function public.admin_search_places(int) to authenticated;
grant execute on function public.admin_rising_searches(int) to authenticated;

commit;

-- Delete searches older than 12 months, every night.
select cron.schedule('servly-search-log-cleanup', '15 3 * * *',
  $job$delete from public.search_log where created_at < now() - interval '12 months'$job$);

-- Check: 0 searches the first time.
select count(*) as searches_logged from public.search_log;
