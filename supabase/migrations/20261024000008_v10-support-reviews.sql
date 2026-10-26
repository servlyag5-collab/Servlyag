-- Servly AG v10: contact support and reviews. (Receipts use the existing payments table; no change needed.)
-- Run this AFTER upgrade-v9-phone-privacy.sql (Supabase > SQL Editor).

-- 1. Contact support. Merchants send requests; you read and answer them in Table Editor > support_tickets:
--    type your answer in `reply` and set `status` to 'resolved'. The merchant sees both in the app.
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null check (topic in ('billing', 'listing', 'account', 'other')),
  subject text not null check (char_length(subject) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index support_tickets_user_idx on public.support_tickets (user_id, created_at desc);

-- Your reply gets a timestamp automatically.
create function public.support_reply_time() returns trigger
language plpgsql as $$
begin
  if new.reply is distinct from old.reply then new.replied_at := now(); end if;
  return new;
end $$;
create trigger support_tickets_reply before update on public.support_tickets
  for each row execute function public.support_reply_time();

alter table public.support_tickets enable row level security;
create policy "own tickets readable" on public.support_tickets for select to authenticated using (user_id = auth.uid());
create policy "own tickets created" on public.support_tickets for insert to authenticated
  with check (user_id = auth.uid() and status = 'open' and reply is null);
revoke update, delete on public.support_tickets from anon, authenticated;   -- only you (dashboard) can reply or close

-- 2. Review requests in chat: a message can be plain text or a merchant's "please review us" request.
alter table public.messages add column kind text not null default 'text' check (kind in ('text', 'review_request'));

create function public.check_review_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'review_request' and not exists (
    select 1 from public.conversations c where c.id = new.conversation_id and c.merchant_id = new.sender_id) then
    raise exception 'Only the merchant can ask for a review.';
  end if;
  return new;
end $$;
create trigger messages_review_request before insert on public.messages
  for each row execute function public.check_review_request();

-- 3. Reviews: 1-5 stars and an optional comment. One review per customer per merchant (they can edit it,
--    never add a second). Only real customers can review: someone who has a conversation with that merchant.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, customer_id),
  check (merchant_id <> customer_id)
);
create index reviews_merchant_idx on public.reviews (merchant_id, created_at desc);

create function public.reviews_touch() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger reviews_updated before update on public.reviews
  for each row execute function public.reviews_touch();

alter table public.reviews enable row level security;
create policy "reviews are public" on public.reviews for select to anon, authenticated using (true);
create policy "real customers review once" on public.reviews for insert to authenticated
  with check (customer_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.customer_id = auth.uid() and c.merchant_id = reviews.merchant_id and c.last_message <> ''));
revoke update, delete on public.reviews from anon, authenticated;
grant update (rating, comment) on public.reviews to authenticated;
create policy "customers edit own review" on public.reviews for update to authenticated using (customer_id = auth.uid());

-- Average stars and number of reviews per merchant (public, like the reviews themselves).
create view public.merchant_ratings with (security_invoker = true) as
  select merchant_id, round(avg(rating)::numeric, 1) as average, count(*)::int as total
  from public.reviews group by merchant_id;
grant select on public.merchant_ratings to anon, authenticated;

-- Live updates for support replies.
alter publication supabase_realtime add table public.support_tickets;
