-- Servly AG v26: more controls on Admin > Merchants (admins only). No tables change, no data is removed.
--
--   * See a merchant's listings, each with a Turn off / Turn on button (admin_merchant_listings,
--     admin_set_listing_on). Turning on also un-pauses a listing paused by a move to a smaller plan:
--     the owner may go over a plan's listing limit on purpose. A listing still only shows to customers
--     while the merchant's plan has time left.
--   * Change plan now, with no payment and no receipt (admin_change_plan): Starter / Growth / Business
--     and the booking app, straight away. Moving down pauses listings over the new limit (oldest kept).
--   * Extend plan, with no payment and no receipt (admin_extend_plan): adds 1-365 days, also to an
--     expired plan, so the merchant's listings show again.
--
-- Paste into Supabase > SQL Editor > Run (after v25).

-- 1. A merchant's listings (newest first), for their card in Admin.
create function public.admin_merchant_listings(p_user uuid)
returns table (id uuid, title text, active boolean, paused boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query select s.id, s.title, s.active, s.paused, s.created_at
    from public.services s where s.merchant_id = p_user order by s.created_at desc;
end $$;
revoke all on function public.admin_merchant_listings(uuid) from public, anon;
grant execute on function public.admin_merchant_listings(uuid) to authenticated;

-- 2. Turn one listing off (hidden) or on (shown, and no longer paused).
create function public.admin_set_listing_on(p_service uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.services set active = p_on, paused = case when p_on then false else paused end where id = p_service;
  if not found then raise exception 'Listing not found.'; end if;
end $$;
revoke all on function public.admin_set_listing_on(uuid, boolean) from public, anon;
grant execute on function public.admin_set_listing_on(uuid, boolean) to authenticated;

-- 3. Change plan now, free of charge: no payments row, no receipt, the end date stays the same.
--    Also clears a waiting move to a smaller plan and the plan they chose but haven't paid for.
create function public.admin_change_plan(p_user uuid, p_tier text, p_booking boolean default false)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Merchant not found.'; end if;
  n := public.apply_plan_change(p_user, p_tier, p_booking);   -- returns how many listings were paused
  update public.profiles set requested_tier = null where id = p_user;
  return n;
end $$;
revoke all on function public.admin_change_plan(uuid, text, boolean) from public, anon;
grant execute on function public.admin_change_plan(uuid, text, boolean) to authenticated;

-- 4. Extend plan, free of charge: from today if it has ended, otherwise from its current end date.
create function public.admin_extend_plan(p_user uuid, p_days int)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare ends timestamptz;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_days is null or p_days < 1 or p_days > 365 then raise exception 'Choose 1 to 365 days.'; end if;
  update public.profiles
     set plan_expires_at = greatest(coalesce(plan_expires_at, now()), now()) + make_interval(days => p_days)
   where id = p_user
  returning plan_expires_at into ends;
  if ends is null then raise exception 'Merchant not found.'; end if;
  return ends;
end $$;
revoke all on function public.admin_extend_plan(uuid, int) from public, anon;
grant execute on function public.admin_extend_plan(uuid, int) to authenticated;
