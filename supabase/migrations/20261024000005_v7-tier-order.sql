-- Servly AG v7: search order by tier. Business listings first, then Growth, then Starter
-- (newest first within each tier). Run this AFTER upgrade-v6-tiers-booking.sql (Supabase > SQL Editor).

-- 1. Business now outranks Growth (Starter stays 0).
update public.tiers set priority_rank = 2 where id = 'premium';
update public.tiers set priority_rank = 1 where id = 'plus';
update public.tiers set priority_rank = 0 where id = 'basic';

-- 2. Bring every existing listing in line with its merchant's current tier.
--    (New listings and tier changes already copy priority_rank automatically.)
update public.services s
   set priority = t.priority_rank
  from public.profiles p join public.tiers t on t.id = p.tier_id
 where p.id = s.merchant_id;
