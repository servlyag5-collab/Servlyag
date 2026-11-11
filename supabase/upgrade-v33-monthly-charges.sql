-- Servly AG v33: automatic monthly charges of the saved card (owner's rules, 2026-11-10).
-- Run AFTER v32. Adds one setting, one table and a daily job; nothing is deleted.
--
--   * profiles.auto_pay: "Pay automatically each month", on by default. Merchants switch it on Account
--     (set_auto_pay); off = the plan simply ends on its end date.
--   * renewal_charges: one row per merchant per renewal (the plan's end date), with each try's result.
--     Server only.
--   * Every morning (6:00 AM Antigua) the payment-renewals server function charges the saved card
--     (billing_cards, from v32) of each merchant whose plan ends in the next 24 hours, at the same price
--     as pressing Pay (plan - promo + bookings upgrade; a waiting move to a smaller plan is charged at the
--     smaller plan). A paid charge runs activate_plan (one month, receipt) and the new end date is exactly
--     one month after the old one.
--   * A failed charge is tried again on each of the next 3 days; the listings stay visible meanwhile
--     (the end date moves to old end + 3 days), and the merchant gets a notification each time. After
--     3 days without payment the listings hide, as when any plan ends.
--   * Nothing is charged for merchants without a saved card, so this is safe to run before CyberSource
--     switches tokenization on.
--
-- Paste into Supabase > SQL Editor > Run.

------------------------------------------------------------------------------------------------
-- 1. SETTING AND TABLE
------------------------------------------------------------------------------------------------
alter table public.profiles add column if not exists auto_pay boolean not null default true;
-- No column grant: merchants change it only through set_auto_pay() and read it through my_auto_pay().

create table if not exists public.renewal_charges (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.profiles(id) on delete set null,   -- kept for the books if an account is deleted
  due_at timestamptz not null,                                           -- the plan's end date being renewed
  tier_id text not null references public.tiers(id),
  booking boolean not null default false,                                -- bookings upgrade included
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'XCD',
  status text not null default 'new' check (status in ('new', 'charging', 'paid', 'failed', 'stopped', 'cancelled')),
  attempts int not null default 0,
  last_attempt_at timestamptz,
  reason_code text,
  message text,
  transaction_id text,                                                   -- CyberSource's payment id
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists renewal_charges_once on public.renewal_charges (merchant_id, due_at);
alter table public.renewal_charges enable row level security;            -- no policies: server only
revoke all on public.renewal_charges from anon, authenticated;

------------------------------------------------------------------------------------------------
-- 2. THE PRICE OF THE NEXT MONTH (same sum as payment-start and activate_plan)
------------------------------------------------------------------------------------------------
create or replace function public.renewal_price(p_user uuid)
returns table (tier_id text, booking boolean, amount numeric)
language sql stable security definer set search_path = public as $$
  with p as (
    select coalesce(pr.next_tier, pr.tier_id) as tier,
           coalesce(pr.booking_requested, false) or (pr.next_tier is not null and coalesce(pr.next_booking, false)) as want
      from public.profiles pr where pr.id = p_user
  )
  select t.id,
         p.want and not t.booking_included,
         round(t.monthly_price - public.next_promo_discount(p_user, t.id)
               + case when p.want and not t.booking_included
                      then (select a.monthly_price from public.addons a where a.id = 'booking') else 0 end, 2)
    from p join public.tiers t on t.id = p.tier;
$$;
revoke all on function public.renewal_price(uuid) from public, anon, authenticated;

------------------------------------------------------------------------------------------------
-- 3. THE DAILY RUN (called by the payment-renewals server function only)
------------------------------------------------------------------------------------------------
-- Tidies up, adds the renewals due in the next 24 hours, and hands back the ones to charge now
-- (marked "charging", at most one try a day each).
create or replace function public.renewals_due()
returns table (charge_id uuid, merchant uuid, token text, charge_amount numeric, charge_currency text,
               previous_ref text, attempt_no int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r record;
begin
  -- Paid by hand meanwhile, auto-pay switched off, or no saved card any more: nothing to charge.
  update public.renewal_charges c set status = 'cancelled', updated_at = now()
   where c.status in ('new', 'failed')
     and not exists (select 1 from public.profiles p join public.billing_cards b on b.merchant_id = p.id
                      where p.id = c.merchant_id and p.auto_pay and p.plan_expires_at <= c.due_at + interval '3 days');

  -- 3 days of tries are over: the listings hide (the end date passes), and the merchant is told.
  for r in update public.renewal_charges c set status = 'stopped', updated_at = now()
            where c.status = 'failed' and now() >= c.due_at + interval '3 days'
            returning c.merchant_id
  loop
    perform public.send_push(r.merchant_id, 'Your Servly listings are hidden',
      'We couldn''t take your monthly payment, so customers can''t see your listings. Open your plan and pay to bring them back.', '/plan');
  end loop;

  -- New renewals: plans ending in the next 24 hours (= on their end date, as the job runs each morning).
  insert into public.renewal_charges (merchant_id, due_at, tier_id, booking, amount)
  select p.id, p.plan_expires_at, rp.tier_id, rp.booking, rp.amount
    from public.profiles p
    join public.billing_cards b on b.merchant_id = p.id
    cross join lateral public.renewal_price(p.id) rp
   where p.auto_pay
     and p.plan_expires_at > now() and p.plan_expires_at <= now() + interval '24 hours'
     and rp.amount > 0
     and not exists (select 1 from public.renewal_charges o
                      where o.merchant_id = p.id and o.status in ('new', 'charging', 'failed'))
  on conflict (merchant_id, due_at) do nothing;

  -- The ones to charge now.
  return query
  with taken as (
    update public.renewal_charges c
       set status = 'charging', attempts = c.attempts + 1, last_attempt_at = now(), updated_at = now()
      from public.billing_cards b
     where b.merchant_id = c.merchant_id
       and c.status in ('new', 'failed')
       and (c.last_attempt_at is null or c.last_attempt_at < now() - interval '20 hours')
    returning c.id, c.merchant_id, b.payment_token, c.amount, c.currency, c.attempts
  )
  select t.id, t.merchant_id, t.payment_token, t.amount, t.currency,
         (select pay.provider_ref from public.payments pay
           where pay.merchant_id = t.merchant_id and pay.provider = 'cybersource'
           order by pay.paid_at desc limit 1),
         t.attempts
    from taken t;
end $$;
revoke all on function public.renewals_due() from public, anon, authenticated;
grant execute on function public.renewals_due() to service_role;

-- CyberSource's answer for one charge.
create or replace function public.renewal_result(p_charge uuid, p_ok boolean, p_transaction text,
                                                 p_reason text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.renewal_charges; ends timestamptz; grace timestamptz;
begin
  select * into c from public.renewal_charges where id = p_charge for update;
  if not found or c.status <> 'charging' then return; end if;

  if p_ok then
    update public.renewal_charges
       set status = 'paid', transaction_id = p_transaction, reason_code = p_reason, message = p_message, updated_at = now()
     where id = c.id;
    ends := c.due_at + interval '1 month';
    begin
      -- Undo any extra days given while retrying, add the month (receipt included), and make the new end
      -- date exactly one month after the old one.
      update public.profiles set plan_expires_at = c.due_at where id = c.merchant_id and plan_expires_at > c.due_at;
      perform public.activate_plan(c.merchant_id, c.tier_id, c.booking, 'cybersource', coalesce(p_transaction, c.id::text));
      update public.profiles set plan_expires_at = ends where id = c.merchant_id;
    exception when others then
      -- Money was taken but the plan didn't switch on: the owner sees this in renewal_charges and fixes it in Admin.
      update public.renewal_charges set message = 'Paid, but the plan didn''t switch on: ' || sqlerrm where id = c.id;
      return;
    end;
    perform public.send_push(c.merchant_id, 'Servly payment received',
      'Thank you! Your plan is renewed until ' || to_char(ends at time zone 'America/Antigua', 'FMDD FMMonth YYYY') ||
      '. Your receipt is on your Account page.', '/account');
  else
    update public.renewal_charges
       set status = 'failed', reason_code = p_reason, message = p_message, updated_at = now()
     where id = c.id;
    -- Keep the listings visible while we try again (3 days after the old end date).
    grace := c.due_at + interval '3 days';
    update public.profiles set plan_expires_at = greatest(plan_expires_at, grace) where id = c.merchant_id;
    perform public.send_push(c.merchant_id, 'Your Servly payment didn''t go through',
      'We''ll try your card again tomorrow. Your listings stay visible until ' ||
      to_char(grace at time zone 'America/Antigua', 'FMDay FMDD FMMonth') ||
      '. To pay now, open your plan and press Pay.', '/plan');
  end if;
end $$;
revoke all on function public.renewal_result(uuid, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.renewal_result(uuid, boolean, text, text, text) to service_role;

------------------------------------------------------------------------------------------------
-- 4. FOR THE MERCHANT (Account page)
------------------------------------------------------------------------------------------------
create or replace function public.my_auto_pay()
returns table (auto_pay boolean, card_type text, card_last4 text, card_expiry text,
               next_charge_at timestamptz, next_amount numeric, failing boolean, retry_until timestamptz)
language sql stable security definer set search_path = public as $$
  select p.auto_pay, b.card_type, b.card_last4, b.card_expiry, p.plan_expires_at,
         (select rp.amount from public.renewal_price(p.id) rp),
         f.due_at is not null,
         f.due_at + interval '3 days'
    from public.profiles p
    left join public.billing_cards b on b.merchant_id = p.id
    left join lateral (select c.due_at from public.renewal_charges c
                        where c.merchant_id = p.id and c.status = 'failed'
                        order by c.due_at desc limit 1) f on true
   where p.id = auth.uid();
$$;
revoke all on function public.my_auto_pay() from public, anon;
grant execute on function public.my_auto_pay() to authenticated;

create or replace function public.set_auto_pay(p_on boolean) returns void
language sql security definer set search_path = public as $$
  update public.profiles set auto_pay = coalesce(p_on, true) where id = auth.uid();
$$;
revoke all on function public.set_auto_pay(boolean) from public, anon;
grant execute on function public.set_auto_pay(boolean) to authenticated;

------------------------------------------------------------------------------------------------
-- 5. "ENDS SOON" REMINDER: says "renews" for automatic payments (otherwise the same as v22)
------------------------------------------------------------------------------------------------
create or replace function public.plan_expiry_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  for p in select pr.id, pr.plan_expires_at,
                  exists (select 1 from public.free_trials f where f.merchant_id = pr.id and f.ends_at = pr.plan_expires_at) as trial,
                  (pr.auto_pay and exists (select 1 from public.billing_cards b where b.merchant_id = pr.id)) as auto
           from public.profiles pr
           where pr.plan_expires_at > now() + interval '2 days' and pr.plan_expires_at <= now() + interval '3 days'
             -- merchants whose payment is being retried get those notifications instead
             and not exists (select 1 from public.renewal_charges c where c.merchant_id = pr.id and c.status in ('charging', 'failed'))
  loop
    if p.auto then
      perform public.send_push(p.id, 'Your Servly plan renews soon',
        'Your plan renews on ' || to_char(p.plan_expires_at at time zone 'America/Antigua', 'FMDay FMDD FMMonth') ||
        ' and your saved card will be charged. You can turn automatic payments off on your Account page.', '/account');
    elsif p.trial then
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

------------------------------------------------------------------------------------------------
-- 6. THE DAILY JOB: 10:00 UTC = 6:00 AM Antigua
------------------------------------------------------------------------------------------------
select cron.schedule('servly-renewals', '0 10 * * *', $job$
  select net.http_post(
    url := 'https://uaeatlkrfbznabybawdi.supabase.co/functions/v1/payment-renewals',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 60000)
$job$);

-- Check: the new setting, the empty table and the job.
select (select count(*) from public.profiles where auto_pay) as merchants_with_auto_pay_on,
       (select count(*) from public.renewal_charges) as renewal_rows,
       (select schedule from cron.job where jobname = 'servly-renewals') as daily_job;
