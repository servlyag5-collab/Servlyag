-- Servly AG v6: tier names, and the booking add-on chosen once per merchant (on the Plan screen).
-- Run this AFTER upgrade-v5-guest-browse.sql (Supabase > SQL Editor).

-- 1. New tier names. The ids (basic / plus / premium) stay the same; the app uses the ids.
update public.tiers set name = 'Starter'  where id = 'basic';
update public.tiers set name = 'Growth'   where id = 'plus';
update public.tiers set name = 'Business' where id = 'premium';

-- 2. Starter and Growth merchants tick "Add the booking app" on the Plan screen.
--    (The old per-listing services.booking_requested column is no longer used by the app.)
alter table public.profiles add column booking_requested boolean not null default false;
grant update (booking_requested) on public.profiles to authenticated;

-- 3. activate_plan now also charges the add-on when the merchant ticked it,
--    and switches booking on for ALL their listings.
create or replace function public.activate_plan(p_user uuid, p_tier text, p_booking boolean default false,
                                                p_provider text default 'manual', p_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tiers; a numeric; amt numeric; want boolean;
begin
  select * into t from public.tiers where id = p_tier;
  if not found then raise exception 'unknown tier %', p_tier; end if;
  select monthly_price into a from public.addons where id = 'booking';
  select p_booking or coalesce(booking_requested, false) into want from public.profiles where id = p_user;
  want := coalesce(want, p_booking) and not t.booking_included;
  amt := t.monthly_price + case when want then a else 0 end;
  update public.profiles
     set tier_id = p_tier, requested_tier = null,
         plan_expires_at = greatest(coalesce(plan_expires_at, now()), now()) + interval '1 month'
   where id = p_user;
  if t.booking_included or want then
    update public.services set booking_enabled = true where merchant_id = p_user;
  end if;
  insert into public.payments (merchant_id, tier_id, amount, booking_addon, provider, provider_ref)
  values (p_user, p_tier, amt, want, p_provider, p_ref);
end $$;
revoke all on function public.activate_plan(uuid, text, boolean, text, text) from public, anon, authenticated;

-- 4. A new listing gets booking if the tier includes it, or the merchant already has it switched on.
create or replace function public.set_service_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select t.priority_rank,
         t.booking_included or exists (select 1 from public.services s where s.merchant_id = new.merchant_id and s.booking_enabled)
    into new.priority, new.booking_enabled
  from public.profiles p join public.tiers t on t.id = p.tier_id where p.id = new.merchant_id;
  return new;
end $$;
