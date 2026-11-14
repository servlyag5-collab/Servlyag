-- Servly AG v37: ABST (Antigua and Barbuda Sales Tax), 17%, added on top of plan and bookings-upgrade prices
-- (owner's choices, 2026-11-14). Built now, OFF until Servly is registered with Inland Revenue: the owner switches
-- it on in Admin > Promos > ABST, which needs the ABST registration number (printed on receipts).
--
--   * tax_settings: one row. abst_on (starts OFF), abst_rate (17), abst_number. Everyone can read it (Checkout
--     and the Pricing page show it); only admins change it, with admin_set_abst().
--   * abst_amount(net): the ABST on an amount (0 while off), rounded to the cent.
--   * Pay (payment-start), monthly charges (renewal_price) and receipts (activate_plan) all add it:
--       total = plan - promo discount + bookings upgrade, then + 17% ABST.
--   * payments.amount stays "total paid" (now including ABST); payments.abst / abst_rate / abst_number keep the
--     tax part, the rate and the registration number used, so old receipts stay right if anything changes.
--   * payment_orders.abst: the ABST inside each order's amount.
--
-- Paste into Supabase > SQL Editor > Run (after v36). Then deploy the payment-start function again.

begin;

create table if not exists public.tax_settings (
  id boolean primary key default true check (id),          -- only one row
  abst_on boolean not null default false,
  abst_rate numeric(5,2) not null default 17 check (abst_rate >= 0 and abst_rate <= 50),
  abst_number text,
  updated_at timestamptz not null default now()
);
insert into public.tax_settings (id) values (true) on conflict (id) do nothing;
alter table public.tax_settings enable row level security;
drop policy if exists "anyone reads tax settings" on public.tax_settings;
create policy "anyone reads tax settings" on public.tax_settings for select to anon, authenticated using (true);
revoke all on public.tax_settings from anon, authenticated;
grant select on public.tax_settings to anon, authenticated;

-- The ABST on an amount (0 while ABST is off).
create or replace function public.abst_amount(p_net numeric) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select case when s.abst_on and coalesce(p_net, 0) > 0 then round(p_net * s.abst_rate / 100, 2) else 0 end
                     from public.tax_settings s where s.id), 0);
$$;
revoke all on function public.abst_amount(numeric) from public, anon, authenticated;
grant execute on function public.abst_amount(numeric) to service_role;

-- Admin: switch ABST on or off. Switching on needs the registration number.
create or replace function public.admin_set_abst(p_on boolean, p_number text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can change ABST.'; end if;
  if p_on and nullif(trim(coalesce(p_number, '')), '') is null then
    raise exception 'Enter your ABST registration number first.';
  end if;
  update public.tax_settings
     set abst_on = p_on, abst_number = nullif(trim(coalesce(p_number, '')), ''), updated_at = now()
   where id;
end $$;
revoke all on function public.admin_set_abst(boolean, text) from public, anon;
grant execute on function public.admin_set_abst(boolean, text) to authenticated;

alter table public.payments add column if not exists abst numeric(10,2) not null default 0;
alter table public.payments add column if not exists abst_rate numeric(5,2);
alter table public.payments add column if not exists abst_number text;
alter table public.payment_orders add column if not exists abst numeric(10,2) not null default 0;
grant select (abst) on public.payment_orders to authenticated;

-- Activating a paid month (card payment, monthly charge, or Admin "paid by hand"): same as v23, plus ABST.
create or replace function public.activate_plan(p_user uuid, p_tier text, p_booking boolean default false,
                                                p_provider text default 'manual', p_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tiers; cur public.tiers; pr public.profiles; a numeric; amt numeric; want boolean; still_paid boolean;
        disc numeric; promo text; tax numeric; s public.tax_settings;
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
  tax := public.abst_amount(amt);
  select * into s from public.tax_settings where id;
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

  insert into public.payments (merchant_id, tier_id, amount, booking_addon, provider, provider_ref, discount, promo_code,
                               abst, abst_rate, abst_number)
  values (p_user, p_tier, amt + tax, want, p_provider, p_ref, disc, promo,
          tax, case when tax > 0 then s.abst_rate end, case when tax > 0 then s.abst_number end);
end $$;
revoke all on function public.activate_plan(uuid, text, boolean, text, text) from public, anon, authenticated;
grant execute on function public.activate_plan(uuid, text, boolean, text, text) to service_role;

-- What the next automatic monthly charge will be: same as v33, plus ABST.
create or replace function public.renewal_price(p_user uuid)
returns table (tier_id text, booking boolean, amount numeric)
language sql stable security definer set search_path = public as $$
  with p as (
    select coalesce(pr.next_tier, pr.tier_id) as tier,
           coalesce(pr.booking_requested, false) or (pr.next_tier is not null and coalesce(pr.next_booking, false)) as want
      from public.profiles pr where pr.id = p_user
  ), x as (
    select t.id, p.want and not t.booking_included as b,
           round(t.monthly_price - public.next_promo_discount(p_user, t.id)
                 + case when p.want and not t.booking_included
                        then (select a.monthly_price from public.addons a where a.id = 'booking') else 0 end, 2) as net
      from p join public.tiers t on t.id = p.tier
  )
  select x.id, x.b, round(x.net + public.abst_amount(x.net), 2) from x;
$$;
revoke all on function public.renewal_price(uuid) from public, anon, authenticated;

commit;

-- Check: one row, ABST off, 17%.
select abst_on, abst_rate, abst_number from public.tax_settings;
