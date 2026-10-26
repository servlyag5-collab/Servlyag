-- Servly AG v5: guests can browse without an account.
-- Run this AFTER schema.sql and upgrade-v4.sql (Supabase > SQL Editor).
-- Guests ("anon", not logged in) can search active, paid-up listings and see the public
-- business profile (name, bio, phone, tier). They still need an account to send a note,
-- offer a service, or see an inbox, plan or payments.

-- 1. Business profiles: guests see only these columns, and only for merchants with an active plan
--    (customers' own profiles stay private).
revoke select on public.profiles from anon;
grant select (id, display_name, bio, phone, tier_id, plan_expires_at) on public.profiles to anon;
create policy "guests read active businesses" on public.profiles for select to anon
  using (plan_expires_at > now());

-- 2. Listings: the same rule logged-in customers have (active, and the merchant's plan is paid up).
create policy "guests read active services" on public.services for select to anon
  using (active and exists (
    select 1 from public.profiles p where p.id = merchant_id and p.plan_expires_at > now()));
