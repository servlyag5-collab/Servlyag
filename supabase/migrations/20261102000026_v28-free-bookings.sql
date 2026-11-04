-- Servly AG v28: free bookings for a number of days (Admin > Merchants), and no more "forever on" booking switch.
--
-- A merchant now has the booking app when ANY of these is true:
--   * their plan is Business and still has time left (bookings included),
--   * they paid for the bookings upgrade in the last 32 days,
--   * their free trial included bookings and hasn't ended,
--   * NEW: the owner gave them free bookings and that time hasn't run out (profiles.free_booking_until).
-- The old Admin "Booking on/off" switch (services.booking_enabled) no longer counts: it stayed on forever.
-- Merchants switched on that way lose bookings unless one of the reasons above applies.
--
-- Paste into Supabase > SQL Editor > Run (after v27). No data is removed.

-- 1. When the owner's free bookings end (empty = none). Not readable or changeable by merchants.
alter table public.profiles add column free_booking_until timestamptz;

-- 2. The booking rule (same as v22, with free bookings instead of the old switch).
create or replace function public.merchant_has_booking(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p join public.tiers t on t.id = p.tier_id
                 where p.id = p_uid and t.booking_included and p.plan_expires_at > now())
      or exists (select 1 from public.payments where merchant_id = p_uid and booking_addon and paid_at > now() - interval '32 days')
      or exists (select 1 from public.free_trials where merchant_id = p_uid and booking and ends_at > now())
      or exists (select 1 from public.profiles where id = p_uid and free_booking_until > now());
$$;
revoke all on function public.merchant_has_booking(uuid) from public, anon, authenticated;

-- Why a merchant has bookings, for their Admin card: business / paid / trial / free (or null = no bookings).
create function public.booking_source(p_uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.profiles p join public.tiers t on t.id = p.tier_id
                 where p.id = p_uid and t.booking_included and p.plan_expires_at > now()) then 'business'
    when exists (select 1 from public.payments where merchant_id = p_uid and booking_addon and paid_at > now() - interval '32 days') then 'paid'
    when exists (select 1 from public.free_trials where merchant_id = p_uid and booking and ends_at > now()) then 'trial'
    when exists (select 1 from public.profiles where id = p_uid and free_booking_until > now()) then 'free'
  end;
$$;
revoke all on function public.booking_source(uuid) from public, anon, authenticated;

-- 3. Admin: free bookings for 1-365 days (added from today, or from the current free end date).
create function public.admin_free_booking(p_user uuid, p_days int)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare ends timestamptz;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_days is null or p_days < 1 or p_days > 365 then raise exception 'Choose 1 to 365 days.'; end if;
  update public.profiles
     set free_booking_until = greatest(coalesce(free_booking_until, now()), now()) + make_interval(days => p_days)
   where id = p_user
  returning free_booking_until into ends;
  if ends is null then raise exception 'Merchant not found.'; end if;
  return ends;
end $$;
revoke all on function public.admin_free_booking(uuid, int) from public, anon;
grant execute on function public.admin_free_booking(uuid, int) to authenticated;

-- Admin: end free bookings now. (Bookings from a Business plan, a payment or a trial are not touched.)
create function public.admin_stop_free_booking(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.profiles set free_booking_until = null where id = p_user;
  update public.services set booking_enabled = false where merchant_id = p_user;
end $$;
revoke all on function public.admin_stop_free_booking(uuid) from public, anon;
grant execute on function public.admin_stop_free_booking(uuid) to authenticated;

-- 4. Merchant search (same as v23), plus why they have bookings and when free bookings end.
drop function public.admin_find_merchants(text);
create function public.admin_find_merchants(p_query text)
returns table (id uuid, display_name text, email text, tier_id text, plan_expires_at timestamptz, requested_tier text,
               booking_requested boolean, listings int, has_booking boolean, trial_ends_at timestamptz, promo text,
               booking_source text, free_booking_until timestamptz)
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
           p.free_booking_until
    from public.profiles p join auth.users u on u.id = p.id
    where coalesce(trim(p_query), '') = '' or p.display_name ilike '%' || trim(p_query) || '%' or u.email ilike '%' || trim(p_query) || '%'
    order by p.requested_tier is null, p.created_at desc
    limit 50;
end $$;
revoke all on function public.admin_find_merchants(text) from public, anon;
grant execute on function public.admin_find_merchants(text) to authenticated;
