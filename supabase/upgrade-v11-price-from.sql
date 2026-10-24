-- Servly AG v11: "From" prices. A merchant can mark a listing's price as a starting price
-- ("From EC$500", e.g. a hairdresser with add-ons) or a fixed price ("EC$30", e.g. a barber).
-- Run this AFTER upgrade-v10-support-reviews.sql (Supabase > SQL Editor).
-- Existing listings stay fixed prices until the merchant switches From on.

alter table public.services add column price_from boolean not null default false;
grant update (price_from) on public.services to authenticated;
