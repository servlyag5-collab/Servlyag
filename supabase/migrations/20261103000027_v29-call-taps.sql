-- Servly AG v29: count taps on Call buttons (listing page and business profile). OWNER ONLY for now:
-- the counts show in Admin > Merchants; merchants will see them in a later app update (no database change
-- needed then: the history from today on is kept).
-- Servly can't know whether a call connected (the phone's own dialer makes it), only that Call was tapped.
-- No names or phone numbers are stored with a tap: only which business / listing, where, and when.
-- Guests' taps count too. Paste into Supabase > SQL Editor > Run (after v28). No existing data changes.

-- 1. One row per tap. Nobody can read or write this table directly; only the functions below.
create table public.call_taps (
  id bigint generated always as identity primary key,
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null, -- empty when tapped on the business profile
  source text not null check (source in ('listing', 'profile')),
  created_at timestamptz not null default now()
);
create index call_taps_merchant_time on public.call_taps (merchant_id, created_at);
alter table public.call_taps enable row level security;   -- no policies: closed to everyone but the functions
revoke all on public.call_taps from anon, authenticated;

-- 2. The app records a tap (anyone, also guests). Only for a business that shows a phone number,
--    and at most one tap per business per minute from the same place, so nobody can pile up fake numbers quickly.
create function public.record_call_tap(p_merchant uuid, p_service uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = p_merchant and public_phone is not null) then return; end if;
  if p_service is not null and not exists (select 1 from public.services where id = p_service and merchant_id = p_merchant) then return; end if;
  -- Ignore a repeat tap on the same listing (or profile) within a minute (e.g. a double tap).
  if exists (select 1 from public.call_taps where merchant_id = p_merchant and service_id is not distinct from p_service
             and created_at > now() - interval '1 minute') then return; end if;
  insert into public.call_taps (merchant_id, service_id, source)
  values (p_merchant, p_service, case when p_service is null then 'profile' else 'listing' end);
end $$;
revoke all on function public.record_call_tap(uuid, uuid) from public;
grant execute on function public.record_call_tap(uuid, uuid) to anon, authenticated;

-- The 1st of this month, Antigua time (UTC-4), for "this month" counts.
create function public.antigua_month_start() returns timestamptz
language sql stable as $$ select date_trunc('month', now() at time zone 'America/Antigua') at time zone 'America/Antigua'; $$;

-- 3. Admin > Merchants card: the merchant's listings (same as v26) plus call taps per listing.
drop function public.admin_merchant_listings(uuid);
create function public.admin_merchant_listings(p_user uuid)
returns table (id uuid, title text, active boolean, paused boolean, created_at timestamptz, calls_month int, calls_total int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query select s.id, s.title, s.active, s.paused, s.created_at,
      (select count(*)::int from public.call_taps c where c.service_id = s.id and c.created_at >= public.antigua_month_start()),
      (select count(*)::int from public.call_taps c where c.service_id = s.id)
    from public.services s where s.merchant_id = p_user order by s.created_at desc;
end $$;
revoke all on function public.admin_merchant_listings(uuid) from public, anon;
grant execute on function public.admin_merchant_listings(uuid) to authenticated;

-- 4. Merchant search (same as v28), plus call taps this month and overall (listings and profile together).
drop function public.admin_find_merchants(text);
create function public.admin_find_merchants(p_query text)
returns table (id uuid, display_name text, email text, tier_id text, plan_expires_at timestamptz, requested_tier text,
               booking_requested boolean, listings int, has_booking boolean, trial_ends_at timestamptz, promo text,
               booking_source text, free_booking_until timestamptz, calls_month int, calls_total int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
    select p.id, p.display_name, u.email::text, p.tier_id, p.plan_expires_at, p.requested_tier, p.booking_requested,
           (select count(*)::int from public.services s where s.merchant_id = p.id),
           public.merchant_has_booking(p.id),
           (select f.ends_at from public.free_trials f where f.merchant_id = p.id),
           (select case
                     when r.months_used >= c.months then null
                     when r.months_used = 0 and r.hold_until <= now() then r.code || ': not paid within 7 days, full price now'
                     else r.code || ': next payment ' || c.percent_off || '% off the plan (' || (r.months_used + 1) || ' of ' || c.months || ')'
                   end
              from public.promo_redemptions r join public.promo_codes c on c.code = r.code where r.merchant_id = p.id),
           public.booking_source(p.id),
           p.free_booking_until,
           (select count(*)::int from public.call_taps t where t.merchant_id = p.id and t.created_at >= public.antigua_month_start()),
           (select count(*)::int from public.call_taps t where t.merchant_id = p.id)
    from public.profiles p join auth.users u on u.id = p.id
    where coalesce(trim(p_query), '') = '' or p.display_name ilike '%' || trim(p_query) || '%' or u.email ilike '%' || trim(p_query) || '%'
    order by p.requested_tier is null, p.created_at desc
    limit 50;
end $$;
revoke all on function public.admin_find_merchants(text) from public, anon;
grant execute on function public.admin_find_merchants(text) to authenticated;
