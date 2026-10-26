-- Servly AG v9: merchants choose whether customers can see their business phone number (one switch per business).
-- Run this AFTER upgrade-v8-messages.sql (Supabase > SQL Editor).

-- 1. The switch (on by default, so nothing changes for existing merchants) and the number customers may see.
--    public_phone is kept up to date by the database: the real number when the switch is on, empty when off.
alter table public.profiles add column show_phone boolean not null default true;
alter table public.profiles add column public_phone text generated always as (case when show_phone then phone end) stored;
grant update (show_phone) on public.profiles to authenticated;

-- 2. Nobody else can read the real number. Everyone reads public_phone instead.
--    (Column-by-column read access: every column except the private `phone`.)
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, bio, tier_id, created_at, plan_expires_at, requested_tier, booking_requested, show_phone, public_phone)
  on public.profiles to authenticated;
grant select (id, display_name, bio, tier_id, plan_expires_at, public_phone) on public.profiles to anon;

-- 3. A merchant reads their own number (for Account, Offer a service and Edit listing) through this function.
create function public.my_phone() returns text
language sql stable security definer set search_path = public as $$
  select phone from public.profiles where id = auth.uid();
$$;
revoke all on function public.my_phone() from public, anon;
grant execute on function public.my_phone() to authenticated;
