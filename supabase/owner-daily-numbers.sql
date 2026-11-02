-- Servly AG: today's business numbers (READ ONLY: it only counts, it never changes anything).
-- Supabase > SQL Editor > paste > Run. Copy the result table and paste it to Claude for your daily brief.
-- "Last 24 hours" and "this month" use Antigua time (UTC-4).

with antigua as (
  select date_trunc('month', now() - interval '4 hours') + interval '4 hours' as month_start
)
select 'Merchants with a live plan' as item, count(*)::text as value
  from public.profiles where plan_expires_at > now()
union all
select '  of them on a free trial', count(*)::text
  from public.free_trials where ends_at > now()
union all
select '  Starter / Growth / Business',
  (select count(*) from public.profiles where plan_expires_at > now() and tier_id = 'basic') || ' / ' ||
  (select count(*) from public.profiles where plan_expires_at > now() and tier_id = 'plus') || ' / ' ||
  (select count(*) from public.profiles where plan_expires_at > now() and tier_id = 'premium')
union all
select 'Live listings', count(*)::text
  from public.services s join public.profiles p on p.id = s.merchant_id
  where s.active and not s.paused and p.plan_expires_at > now()
union all
select 'New accounts, last 24 hours', count(*)::text
  from public.profiles where created_at > now() - interval '24 hours'
union all
select 'Total accounts', count(*)::text from public.profiles
union all
select 'Money in, last 24 hours (XCD)', coalesce(sum(amount), 0)::text
  from public.payments where paid_at > now() - interval '24 hours'
union all
select 'Money in, this month (XCD)', coalesce(sum(amount), 0)::text
  from public.payments, antigua where paid_at >= antigua.month_start
union all
select 'Payments this month', count(*)::text
  from public.payments, antigua where paid_at >= antigua.month_start
union all
select 'Promo discounts given, this month (XCD)', coalesce(sum(discount), 0)::text
  from public.payments, antigua where paid_at >= antigua.month_start
union all
select 'Plans ending in the next 7 days', count(*)::text
  from public.profiles where plan_expires_at between now() and now() + interval '7 days'
union all
select 'Free trials ending in the next 14 days', count(*)::text
  from public.free_trials where ends_at between now() and now() + interval '14 days'
union all
select 'Plans that ended in the last 7 days', count(*)::text
  from public.profiles where plan_expires_at between now() - interval '7 days' and now()
union all
select 'Open support tickets', count(*)::text
  from public.support_tickets where status = 'open'
union all
select 'Open reports', count(*)::text
  from public.reports where status = 'open'
union all
select 'Promo ' || c.code || (case when c.active then ' (ON)' else ' (off)' end) || ': places taken',
  (select count(*) from public.promo_redemptions r
    where r.code = c.code and (r.first_paid_at is not null or r.hold_until > now()))::text || ' of ' || c.max_uses
  from public.promo_codes c
union all
select 'Messages sent, last 24 hours', count(*)::text
  from public.messages where created_at > now() - interval '24 hours';
