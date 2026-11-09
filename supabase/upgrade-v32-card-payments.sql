-- Servly AG v32: card payments through ACB / CyberSource (Secure Acceptance Hosted Checkout).
-- Run AFTER v31. Adds two tables that only Servly's server functions write to; nothing existing changes.
--
--   * payment_orders: one row each time a merchant presses Pay. It holds the price Servly worked out
--     (the plan, the bookings upgrade, a promo discount), so the amount can't be changed on the way.
--     It is marked paid, declined or cancelled when CyberSource answers; a paid order runs activate_plan
--     (which adds the month and writes the payment row = the receipt). Merchants can see their own
--     orders' status (for the "Payment received" page), never the link secret.
--   * billing_cards: the merchant's saved card as a CyberSource TOKEN (never the card number), plus the
--     last 4 digits and card type for showing. Servly server only (no one in the app can read it).
--     Used later for the monthly charges.
--
-- No changes to plans, prices, payments or receipts. Paste into Supabase > SQL Editor > Run.

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.profiles(id) on delete set null,   -- kept for the books if an account is deleted
  tier_id text not null references public.tiers(id),
  booking boolean not null default false,                                -- bookings upgrade in this payment
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'XCD',
  link_secret text not null,                                             -- opens the payment page once; never shown in the app
  status text not null default 'pending' check (status in ('pending', 'paid', 'declined', 'cancelled', 'error')),
  decision text,                                                         -- CyberSource's answer (ACCEPT, DECLINE, CANCEL, ...)
  reason_code text,
  message text,
  transaction_id text,                                                   -- CyberSource's payment id
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists payment_orders_merchant on public.payment_orders (merchant_id, created_at desc);
create unique index if not exists payment_orders_transaction on public.payment_orders (transaction_id) where transaction_id is not null;

alter table public.payment_orders enable row level security;
revoke all on public.payment_orders from anon, authenticated;
grant select (id, tier_id, booking, amount, currency, status, message, created_at, paid_at) on public.payment_orders to authenticated;
drop policy if exists "own payment orders" on public.payment_orders;
create policy "own payment orders" on public.payment_orders for select to authenticated using (merchant_id = auth.uid());

create table if not exists public.billing_cards (
  merchant_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null default 'cybersource',
  payment_token text not null,                                           -- CyberSource token, not a card number
  card_last4 text,
  card_type text,
  card_expiry text,                                                      -- MM-YYYY, for "your card expires soon"
  updated_at timestamptz not null default now()
);
alter table public.billing_cards enable row level security;                -- no policies: server only
revoke all on public.billing_cards from anon, authenticated;

-- Check: both tables exist (0 rows each to begin with).
select 'payment_orders' as tbl, count(*) from public.payment_orders
union all select 'billing_cards', count(*) from public.billing_cards;
