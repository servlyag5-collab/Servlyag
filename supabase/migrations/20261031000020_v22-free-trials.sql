-- Servly AG v22: free trials for Founding Merchants.
--
-- The owner gives a merchant free time on a plan (default 90 days) from Admin > Start free trial.
--   * No payment row, so no receipt and no fake income.
--   * The plan works exactly like a paid one (listing limit, search order, booking app if included or ticked).
--   * Free time counts like paid time: a move to a smaller plan waits until the trial ends, and a payment
--     during the trial adds its month AFTER the trial (activate_plan already does both).
--   * One free trial per merchant, and only for merchants with no active plan.
--   * When the trial ends unpaid, listings hide from customers like any plan that runs out.
--
-- Paste into Supabase > SQL Editor > Run (after v20; v21 is optional). Nothing is deleted.

------------------------------------------------------------------------------------------------
-- 1. ONE ROW PER FREE TRIAL (a record of who got what)
------------------------------------------------------------------------------------------------
create table public.free_trials (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null unique references public.profiles(id) on delete cascade, -- unique = one trial each
  tier_id text not null references public.tiers(id),
  days int not null check (days between 1 and 365),
  booking boolean not null default false,          -- booking app on during the trial
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  given_by uuid references auth.users(id) on delete set null,
  note text not null default '' check (length(note) <= 200)
);
alter table public.free_trials enable row level security;
-- Merchants read only their own trial (Account, Plan screen). Nobody writes except start_free_trial().
create policy "own free trial readable" on public.free_trials for select to authenticated using (merchant_id = auth.uid());
revoke all on public.free_trials from anon, authenticated;
grant select on public.free_trials to authenticated;

------------------------------------------------------------------------------------------------
-- 2. STARTING A TRIAL
------------------------------------------------------------------------------------------------
-- Server key only (like activate_plan). Returns when the trial ends.
create function public.start_free_trial(p_user uuid, p_tier text, p_days int default 90, p_booking boolean default false,
                                        p_note text default 'Founding Merchant', p_by uuid default null)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare t public.tiers; pr public.profiles; ends timestamptz; with_booking boolean;
begin
  select * into t from public.tiers where id = p_tier;
  if not found then raise exception 'Unknown plan %.', p_tier; end if;
  if p_days is null or p_days < 1 or p_days > 365 then raise exception 'A free trial is 1 to 365 days.'; end if;
  select * into pr from public.profiles where id = p_user for update;
  if not found then raise exception 'Unknown merchant.'; end if;
  if exists (select 1 from public.free_trials where merchant_id = p_user) then
    raise exception 'This merchant already had a free trial.';
  end if;
  if pr.plan_expires_at is not null and pr.plan_expires_at > now() then
    raise exception 'This merchant already has an active plan (until %).',
      to_char(pr.plan_expires_at at time zone 'America/Antigua', 'FMDD FMMonth YYYY');
  end if;

  ends := now() + make_interval(days => p_days);
  with_booking := t.booking_included or coalesce(p_booking, false);
  -- Same plan switch as a paid plan: listing limit, booking app on/off, extra listings paused.
  perform public.apply_plan_change(p_user, p_tier, with_booking);
  update public.profiles set plan_expires_at = ends, requested_tier = null where id = p_user;
  insert into public.free_trials (merchant_id, tier_id, days, booking, ends_at, given_by, note)
  values (p_user, p_tier, p_days, with_booking, ends, p_by, left(coalesce(trim(p_note), ''), 200));
  -- No payments row: a free trial never makes a receipt.
  return ends;
end $$;
revoke all on function public.start_free_trial(uuid, text, int, boolean, text, uuid) from public, anon, authenticated;
grant execute on function public.start_free_trial(uuid, text, int, boolean, text, uuid) to service_role;

-- Admin dashboard: Start free trial.
create function public.admin_start_free_trial(p_user uuid, p_tier text, p_days int default 90, p_booking boolean default false,
                                              p_note text default 'Founding Merchant')
returns timestamptz language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return public.start_free_trial(p_user, p_tier, p_days, p_booking, p_note, auth.uid());
end $$;
revoke all on function public.admin_start_free_trial(uuid, text, int, boolean, text) from public, anon;
grant execute on function public.admin_start_free_trial(uuid, text, int, boolean, text) to authenticated;

------------------------------------------------------------------------------------------------
-- 3. BOOKING APP DURING A TRIAL
------------------------------------------------------------------------------------------------
-- Same as v13, plus: a running trial with the booking app on (so listings made during the trial get it too).
create or replace function public.merchant_has_booking(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p join public.tiers t on t.id = p.tier_id
                 where p.id = p_uid and t.booking_included and p.plan_expires_at > now())
      or exists (select 1 from public.payments where merchant_id = p_uid and booking_addon and paid_at > now() - interval '32 days')
      or exists (select 1 from public.free_trials where merchant_id = p_uid and booking and ends_at > now())
      or exists (select 1 from public.services where merchant_id = p_uid and booking_enabled);
$$;
revoke all on function public.merchant_has_booking(uuid) from public, anon, authenticated;

------------------------------------------------------------------------------------------------
-- 4. ADMIN SEARCH: also says when a merchant's trial ends (empty = never had one)
------------------------------------------------------------------------------------------------
drop function public.admin_find_merchants(text);
create function public.admin_find_merchants(p_query text)
returns table (id uuid, display_name text, email text, tier_id text, plan_expires_at timestamptz, requested_tier text,
               booking_requested boolean, listings int, has_booking boolean, trial_ends_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
    select p.id, p.display_name, u.email::text, p.tier_id, p.plan_expires_at, p.requested_tier, p.booking_requested,
           (select count(*)::int from public.services s where s.merchant_id = p.id),
           public.merchant_has_booking(p.id),
           (select f.ends_at from public.free_trials f where f.merchant_id = p.id)
    from public.profiles p join auth.users u on u.id = p.id
    where coalesce(trim(p_query), '') = '' or p.display_name ilike '%' || trim(p_query) || '%' or u.email ilike '%' || trim(p_query) || '%'
    order by p.requested_tier is null, p.created_at desc
    limit 50;
end $$;

------------------------------------------------------------------------------------------------
-- 5. "ENDS SOON" REMINDER: says "free trial" when it's a trial ending
------------------------------------------------------------------------------------------------
create or replace function public.plan_expiry_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  for p in select pr.id, pr.plan_expires_at,
                  exists (select 1 from public.free_trials f where f.merchant_id = pr.id and f.ends_at = pr.plan_expires_at) as trial
           from public.profiles pr
           where pr.plan_expires_at > now() + interval '2 days' and pr.plan_expires_at <= now() + interval '3 days'
  loop
    if p.trial then
      perform public.send_push(p.id, 'Your Servly free trial ends soon',
        'Your free trial ends on ' || to_char(p.plan_expires_at at time zone 'America/Antigua', 'FMDay FMDD FMMonth') ||
        '. Choose a plan to keep your listings visible to customers.', '/plan');
    else
      perform public.send_push(p.id, 'Your Servly plan ends soon',
        'Your plan ends on ' || to_char(p.plan_expires_at at time zone 'America/Antigua', 'FMDay FMDD FMMonth') ||
        '. Renew to keep your listings visible to customers.', '/plan');
    end if;
  end loop;
end $$;
revoke all on function public.plan_expiry_reminders() from public, anon, authenticated;
