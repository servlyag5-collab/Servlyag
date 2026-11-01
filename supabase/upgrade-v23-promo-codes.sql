-- Servly AG v23: launch promo codes (e.g. LAUNCH50: half price for the first 2 months, 25 merchants).
--
--   * Merchants type the code at Checkout. That holds one of the code's places for 7 days; if they
--     haven't paid by then, the place goes back for someone else.
--   * When their plan is activated (Admin, or later the payment webhook), the plan price (not the
--     booking add-on) is discounted for the code's number of months, and the receipt shows it.
--   * One promo code per merchant, ever. Not combined with a free trial (either one or the other).
--   * Codes start switched OFF. The owner switches them on in Admin > Promo codes.
--
-- Paste into Supabase > SQL Editor > Run (after v22). Nothing is deleted.

------------------------------------------------------------------------------------------------
-- 1. THE CODES, AND WHO USED THEM
------------------------------------------------------------------------------------------------
create table public.promo_codes (
  code text primary key check (code = upper(code) and length(code) between 3 and 30),
  percent_off int not null check (percent_off between 1 and 100),
  months int not null check (months between 1 and 12),      -- how many payments get the discount
  max_uses int not null check (max_uses > 0),                 -- places (merchants)
  active boolean not null default false,                      -- the owner switches it on in Admin
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
revoke all on public.promo_codes from anon, authenticated;  -- nobody can list the codes; only the rules below read them

create table public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.promo_codes(code) on update cascade,
  merchant_id uuid not null unique references public.profiles(id) on delete cascade, -- unique = one code per merchant
  claimed_at timestamptz not null default now(),
  hold_until timestamptz not null,           -- place held until then; after that, only counts once they've paid
  months_used int not null default 0,        -- discounted payments so far
  first_paid_at timestamptz
);
alter table public.promo_redemptions enable row level security;
create policy "own promo readable" on public.promo_redemptions for select to authenticated using (merchant_id = auth.uid());
revoke all on public.promo_redemptions from anon, authenticated;
grant select on public.promo_redemptions to authenticated;

-- Receipts: how much was taken off, and by which code.
alter table public.payments
  add column discount numeric(10,2) not null default 0,
  add column promo_code text;

-- The two launch codes: 50% off for 2 months, 25 places each. Both start OFF.
insert into public.promo_codes (code, percent_off, months, max_uses, active) values
  ('LAUNCH50', 50, 2, 25, false),
  ('LAUNCH50B', 50, 2, 25, false);

-- A place is taken while it's held (7 days) or once the merchant has paid with it.
create function public.promo_places_taken(p_code text) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.promo_redemptions
  where code = p_code and (months_used > 0 or hold_until > now());
$$;
revoke all on function public.promo_places_taken(text) from public, anon, authenticated;

------------------------------------------------------------------------------------------------
-- 2. WHAT MERCHANTS CAN DO (Checkout)
------------------------------------------------------------------------------------------------
-- Apply a code: holds a place for 7 days. Returns the code's deal.
create function public.apply_promo_code(p_code text)
returns table (code text, percent_off int, months int, months_used int, hold_until timestamptz)
language plpgsql security definer set search_path = public as $$
declare c public.promo_codes; r public.promo_redemptions; want text := upper(trim(coalesce(p_code, '')));
begin
  if auth.uid() is null then raise exception 'Please log in.'; end if;
  if exists (select 1 from public.free_trials f where f.merchant_id = auth.uid()) then
    raise exception 'Promo codes can''t be combined with a free trial.';
  end if;
  select * into c from public.promo_codes p where p.code = want for update; -- one at a time per code
  if not found or not c.active then raise exception 'This code has been used up or isn''t active.'; end if;

  select * into r from public.promo_redemptions pr where pr.merchant_id = auth.uid() for update;
  if found then
    if r.months_used > 0 then raise exception 'You''ve already used a promo code (%).', r.code; end if;
    if r.code = want and r.hold_until > now() then
      return query select c.code, c.percent_off, c.months, r.months_used, r.hold_until; return;
    end if;
    delete from public.promo_redemptions where id = r.id; -- an unpaid hold (expired, or another code): replace it
  end if;

  if public.promo_places_taken(want) >= c.max_uses then raise exception 'This code has been used up or isn''t active.'; end if;
  insert into public.promo_redemptions (code, merchant_id, hold_until) values (want, auth.uid(), now() + interval '7 days')
  returning * into r;
  return query select c.code, c.percent_off, c.months, r.months_used, r.hold_until;
end $$;
revoke all on function public.apply_promo_code(text) from public, anon;
grant execute on function public.apply_promo_code(text) to authenticated;

-- Remove an unpaid code (gives the place back).
create function public.remove_my_promo() returns void
language sql security definer set search_path = public as $$
  delete from public.promo_redemptions where merchant_id = auth.uid() and months_used = 0;
$$;
revoke all on function public.remove_my_promo() from public, anon;
grant execute on function public.remove_my_promo() to authenticated;

-- My code, while it still has discounted months left (and is held or already paid with).
create function public.my_promo()
returns table (code text, percent_off int, months int, months_used int, hold_until timestamptz)
language sql stable security definer set search_path = public as $$
  select r.code, c.percent_off, c.months, r.months_used, r.hold_until
  from public.promo_redemptions r join public.promo_codes c on c.code = r.code
  where r.merchant_id = auth.uid() and r.months_used < c.months and (r.months_used > 0 or r.hold_until > now());
$$;
revoke all on function public.my_promo() from public, anon;
grant execute on function public.my_promo() to authenticated;

------------------------------------------------------------------------------------------------
-- 3. PAYING WITH A CODE
------------------------------------------------------------------------------------------------
-- The discount on a merchant's NEXT payment for a plan (0 when none). Used by activate_plan and the webhook.
create function public.next_promo_discount(p_user uuid, p_tier text) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((
    select round(t.monthly_price * c.percent_off / 100.0, 2)
    from public.promo_redemptions r join public.promo_codes c on c.code = r.code, public.tiers t
    where r.merchant_id = p_user and t.id = p_tier and r.months_used < c.months and (r.months_used > 0 or r.hold_until > now())
  ), 0);
$$;
revoke all on function public.next_promo_discount(uuid, text) from public, anon, authenticated;
grant execute on function public.next_promo_discount(uuid, text) to service_role;

-- Same as v20, plus the promo discount (plan price only) and the discount on the payment row.
create or replace function public.activate_plan(p_user uuid, p_tier text, p_booking boolean default false,
                                                p_provider text default 'manual', p_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tiers; cur public.tiers; pr public.profiles; a numeric; amt numeric; want boolean; still_paid boolean;
        disc numeric; promo text;
begin
  select * into t from public.tiers where id = p_tier;
  if not found then raise exception 'unknown tier %', p_tier; end if;
  select * into pr from public.profiles where id = p_user for update;
  if not found then raise exception 'unknown merchant %', p_user; end if;
  select * into cur from public.tiers where id = pr.tier_id;
  select monthly_price into a from public.addons where id = 'booking';
  want := (p_booking or coalesce(pr.booking_requested, false)) and not t.booking_included;
  disc := public.next_promo_discount(p_user, p_tier);
  amt := t.monthly_price - disc + case when want then a else 0 end;
  still_paid := pr.plan_expires_at is not null and pr.plan_expires_at > now();

  if still_paid and t.priority_rank < cur.priority_rank then
    update public.profiles
       set next_tier = p_tier, next_tier_at = pr.plan_expires_at, next_booking = want, requested_tier = null,
           plan_expires_at = pr.plan_expires_at + interval '1 month'
     where id = p_user;
  else
    update public.profiles
       set requested_tier = null, next_tier = null, next_tier_at = null, next_booking = false,
           keep_listings = case when p_tier = pr.tier_id then '{}' else keep_listings end,
           plan_expires_at = greatest(coalesce(plan_expires_at, now()), now()) + interval '1 month'
     where id = p_user;
    if p_tier <> pr.tier_id then
      perform public.apply_plan_change(p_user, p_tier, want);
    elsif t.booking_included or want then
      update public.services set booking_enabled = true where merchant_id = p_user;
    end if;
  end if;

  if disc > 0 then
    update public.promo_redemptions
       set months_used = months_used + 1, first_paid_at = coalesce(first_paid_at, now())
     where merchant_id = p_user
     returning code into promo;
  end if;

  insert into public.payments (merchant_id, tier_id, amount, booking_addon, provider, provider_ref, discount, promo_code)
  values (p_user, p_tier, amt, want, p_provider, p_ref, disc, promo);
end $$;
revoke all on function public.activate_plan(uuid, text, boolean, text, text) from public, anon, authenticated;
grant execute on function public.activate_plan(uuid, text, boolean, text, text) to service_role;

-- Free trials (v22): either a trial or a promo, never both. Starting a trial frees an unpaid hold;
-- a merchant who already paid with a code can't get a trial. (Same as v22 otherwise.)
create or replace function public.start_free_trial(p_user uuid, p_tier text, p_days int default 90, p_booking boolean default false,
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
  if exists (select 1 from public.promo_redemptions where merchant_id = p_user and months_used > 0) then
    raise exception 'This merchant used a promo code, so they can''t also have a free trial.';
  end if;
  delete from public.promo_redemptions where merchant_id = p_user and months_used = 0;

  ends := now() + make_interval(days => p_days);
  with_booking := t.booking_included or coalesce(p_booking, false);
  perform public.apply_plan_change(p_user, p_tier, with_booking);
  update public.profiles set plan_expires_at = ends, requested_tier = null where id = p_user;
  insert into public.free_trials (merchant_id, tier_id, days, booking, ends_at, given_by, note)
  values (p_user, p_tier, p_days, with_booking, ends, p_by, left(coalesce(trim(p_note), ''), 200));
  return ends;
end $$;
revoke all on function public.start_free_trial(uuid, text, int, boolean, text, uuid) from public, anon, authenticated;
grant execute on function public.start_free_trial(uuid, text, int, boolean, text, uuid) to service_role;

------------------------------------------------------------------------------------------------
-- 4. ADMIN
------------------------------------------------------------------------------------------------
-- Admin > Promo codes: each code with its places used, places held (not paid yet), and on/off.
create function public.admin_promo_codes()
returns table (code text, percent_off int, months int, max_uses int, active boolean, paid int, holding int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
    select c.code, c.percent_off, c.months, c.max_uses, c.active,
           (select count(*)::int from public.promo_redemptions r where r.code = c.code and r.months_used > 0),
           (select count(*)::int from public.promo_redemptions r where r.code = c.code and r.months_used = 0 and r.hold_until > now())
    from public.promo_codes c order by c.created_at, c.code;
end $$;
revoke all on function public.admin_promo_codes() from public, anon;
grant execute on function public.admin_promo_codes() to authenticated;

create function public.admin_set_promo_active(p_code text, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.promo_codes set active = p_active where code = upper(trim(p_code));
end $$;
revoke all on function public.admin_set_promo_active(text, boolean) from public, anon;
grant execute on function public.admin_set_promo_active(text, boolean) to authenticated;

-- Merchant search (same as v22), plus a line about their promo code (empty when none or finished).
drop function public.admin_find_merchants(text);
create function public.admin_find_merchants(p_query text)
returns table (id uuid, display_name text, email text, tier_id text, plan_expires_at timestamptz, requested_tier text,
               booking_requested boolean, listings int, has_booking boolean, trial_ends_at timestamptz, promo text)
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
              from public.promo_redemptions r join public.promo_codes c on c.code = r.code where r.merchant_id = p.id)
    from public.profiles p join auth.users u on u.id = p.id
    where coalesce(trim(p_query), '') = '' or p.display_name ilike '%' || trim(p_query) || '%' or u.email ilike '%' || trim(p_query) || '%'
    order by p.requested_tier is null, p.created_at desc
    limit 50;
end $$;
revoke all on function public.admin_find_merchants(text) from public, anon;
grant execute on function public.admin_find_merchants(text) to authenticated;

-- Check: should list LAUNCH50 and LAUNCH50B, both switched off.
select code, percent_off, months, max_uses, active from public.promo_codes;
