-- Servly AG v14: launch readiness.
-- Owner admin dashboard, reports, blocking, review replies, "Delete my account", better search,
-- push notifications (messages, booking reminders, plan ending soon), and safe payment records.
-- Run this AFTER upgrade-v13-bookings.sql (Supabase > SQL Editor).
-- Supabase will warn about "destructive operations": those lines replace old rules with stricter
-- ones (blocking) and change what happens to payment records when an account is deleted (they are
-- now KEPT, without the person's name, for your accounting). No existing data is removed.
--
-- AFTER RUNNING: make yourself an admin (change the email):
--   insert into public.admins (user_id) select id from auth.users where email = 'YOUR-EMAIL';

create extension if not exists pg_trgm with schema extensions;   -- spelling-tolerant search
create extension if not exists pg_net with schema extensions;    -- lets the database send push notifications

------------------------------------------------------------------------------------------------
-- 1. ADMINS (you). Nobody can read or change this list from the app; you add yourself in SQL.
------------------------------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;   -- no policies: invisible to the app

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Admins can read every support ticket and payment.
create policy "admins read all tickets" on public.support_tickets for select to authenticated using (public.is_admin());
create policy "admins read all payments" on public.payments for select to authenticated using (public.is_admin());

-- Find merchants by name or email (for activating plans).
create function public.admin_find_merchants(p_query text)
returns table (id uuid, display_name text, email text, tier_id text, plan_expires_at timestamptz, requested_tier text,
               booking_requested boolean, listings int, has_booking boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
    select p.id, p.display_name, u.email::text, p.tier_id, p.plan_expires_at, p.requested_tier, p.booking_requested,
           (select count(*)::int from public.services s where s.merchant_id = p.id),
           public.merchant_has_booking(p.id)
    from public.profiles p join auth.users u on u.id = p.id
    where coalesce(trim(p_query), '') = '' or p.display_name ilike '%' || trim(p_query) || '%' or u.email ilike '%' || trim(p_query) || '%'
    order by p.requested_tier is null, p.created_at desc
    limit 50;
end $$;

-- Activate (or renew) a merchant's plan after they pay: adds one month and logs the payment.
create function public.admin_activate_plan(p_user uuid, p_tier text, p_booking boolean default false, p_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  perform public.activate_plan(p_user, p_tier, p_booking, 'manual', coalesce(p_ref, 'Admin dashboard'));
end $$;

-- Switch the booking app on or off for all of a merchant's listings.
create function public.admin_set_booking(p_user uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.services set booking_enabled = p_on where merchant_id = p_user;
end $$;

-- Answer a support ticket (and optionally mark it resolved).
create function public.admin_reply_ticket(p_ticket uuid, p_reply text, p_resolve boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.support_tickets set reply = nullif(trim(p_reply), ''), status = case when p_resolve then 'resolved' else status end
   where id = p_ticket;
end $$;

------------------------------------------------------------------------------------------------
-- 2. REPORTS: anyone logged in can report a listing, a review or a user. Admins handle them.
------------------------------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'review', 'user')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'fake', 'offensive', 'scam', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;
create policy "report something" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and admin_note is null);
create policy "own reports or admin" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
revoke update, delete on public.reports from anon, authenticated;

create function public.admin_resolve_report(p_report uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.reports set status = 'resolved', resolved_at = now(), admin_note = nullif(trim(p_note), '') where id = p_report;
end $$;

-- Admins can hide a reported listing (it can be shown again by the merchant only through you).
create function public.admin_hide_listing(p_service uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  update public.services set active = false where id = p_service;
end $$;

------------------------------------------------------------------------------------------------
-- 3. BLOCKING: someone you block can't message you, start a chat with you, or book you.
------------------------------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
create policy "own blocks readable" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "block someone" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "unblock someone" on public.blocks for delete to authenticated using (blocker_id = auth.uid());

create function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

drop policy "participants send messages" on public.messages;
create policy "participants send messages" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.customer_id, c.merchant_id)
      and not public.is_blocked_between(c.customer_id, c.merchant_id)));

drop policy "customer starts conversation" on public.conversations;
create policy "customer starts conversation" on public.conversations for insert to authenticated
  with check (customer_id = auth.uid() and not public.is_blocked_between(customer_id, merchant_id));

drop policy "merchant creates bookings" on public.bookings;
create policy "merchant creates bookings" on public.bookings for insert to authenticated
  with check (merchant_id = auth.uid() and not public.is_blocked_between(customer_id, merchant_id));

------------------------------------------------------------------------------------------------
-- 4. REVIEW REPLIES: the merchant can publicly reply to a review of their listing.
------------------------------------------------------------------------------------------------
alter table public.reviews add column reply text check (char_length(reply) <= 1000);
alter table public.reviews add column replied_at timestamptz;

-- The review's date only changes when the customer edits it, not when the merchant replies.
create or replace function public.reviews_touch() returns trigger
language plpgsql as $$
begin
  if new.rating is distinct from old.rating or new.comment is distinct from old.comment then new.updated_at := now(); end if;
  return new;
end $$;

create function public.reply_to_review(p_review uuid, p_reply text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.reviews set reply = nullif(trim(p_reply), ''), replied_at = case when nullif(trim(p_reply), '') is null then null else now() end
   where id = p_review and merchant_id = auth.uid();
  if not found then raise exception 'Only the merchant can reply to this review.'; end if;
end $$;
revoke all on function public.reply_to_review(uuid, text) from public, anon;
grant execute on function public.reply_to_review(uuid, text) to authenticated;

------------------------------------------------------------------------------------------------
-- 5. DELETE MY ACCOUNT (required by Apple and Google). Removes the account and everything
--    attached to it. Payment records are KEPT without the person's id, for your accounting.
------------------------------------------------------------------------------------------------
alter table public.payments alter column merchant_id drop not null;
alter table public.payments drop constraint if exists payments_merchant_id_fkey;
alter table public.payments add constraint payments_merchant_id_fkey
  foreign key (merchant_id) references public.profiles(id) on delete set null;

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not logged in.'; end if;
  delete from auth.users where id = auth.uid();   -- profile, listings, chats, reviews, bookings follow
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

------------------------------------------------------------------------------------------------
-- 6. SEARCH: tolerant of small spelling mistakes ("phtography", "plumbr"), same visibility rules.
------------------------------------------------------------------------------------------------
create function public.search_services(p_q text default '', p_city text default '', p_village text default '')
returns setof public.services
language sql stable security invoker set search_path = public, extensions as $$
  with q as (select lower(trim(coalesce(p_q, ''))) as t, lower(trim(coalesce(p_city, ''))) as c, lower(trim(coalesce(p_village, ''))) as v)
  select s.* from public.services s, q
  where s.active
    and (q.c = '' or lower(s.city) like '%' || q.c || '%' or similarity(lower(s.city), q.c) > 0.4)
    and (q.v = '' or lower(coalesce(s.village, '')) like '%' || q.v || '%' or similarity(lower(coalesce(s.village, '')), q.v) > 0.4)
    and (q.t = ''
      or lower(s.title) like '%' || q.t || '%'
      or lower(s.description) like '%' || q.t || '%'
      or word_similarity(q.t, lower(s.title)) > 0.45
      or exists (select 1 from unnest(s.tags) tag, regexp_split_to_table(q.t, '\s+') w
                 where length(w) > 1 and (tag = w or tag = q.t or similarity(tag, w) > 0.45)))
  order by s.priority desc, s.created_at desc;
$$;
grant execute on function public.search_services(text, text, text) to anon, authenticated;

------------------------------------------------------------------------------------------------
-- 7. PUSH NOTIFICATIONS through Expo's free push service.
------------------------------------------------------------------------------------------------
create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;   -- managed only through the functions below

create function public.save_push_token(p_token text, p_platform text) returns void
language sql security definer set search_path = public as $$
  insert into public.push_tokens (token, user_id, platform) values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
$$;
create function public.remove_push_token(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;
revoke all on function public.save_push_token(text, text) from public, anon;
revoke all on function public.remove_push_token(text) from public, anon;
grant execute on function public.save_push_token(text, text) to authenticated;
grant execute on function public.remove_push_token(text) to authenticated;

-- Send a notification to every phone a person is logged in on. Never blocks anything if it fails.
create function public.send_push(p_user uuid, p_title text, p_body text, p_url text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare msgs jsonb;
begin
  select jsonb_agg(jsonb_build_object('to', token, 'title', p_title, 'body', p_body, 'sound', 'default',
                                      'data', jsonb_build_object('url', p_url)))
    into msgs from public.push_tokens where user_id = p_user;
  if msgs is null then return; end if;
  perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := msgs,
                        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
exception when others then
  null;   -- a failed notification must never stop a message or booking
end $$;
revoke all on function public.send_push(uuid, text, text, text) from public, anon, authenticated;

-- Every new chat message (including booking cards and reminders) notifies the other person.
create function public.push_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations; who text; title text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  select coalesce(nullif(display_name, ''), 'Servly') into who from public.profiles where id = new.sender_id;
  title := case new.kind when 'booking_reminder' then 'Booking reminder'
                         when 'booking' then 'New booking from ' || who
                         else who end;
  perform public.send_push(case when new.sender_id = c.customer_id then c.merchant_id else c.customer_id end,
                           title, left(new.body, 140), '/chat/' || new.conversation_id);
  return new;
end $$;
create trigger messages_push after insert on public.messages
  for each row execute function public.push_new_message();

-- Merchants whose plan ends in about 3 days get a reminder (daily at 9:00 AM Antigua time).
create function public.plan_expiry_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  for p in select id, plan_expires_at from public.profiles
           where plan_expires_at > now() + interval '2 days' and plan_expires_at <= now() + interval '3 days'
  loop
    perform public.send_push(p.id, 'Your Servly plan ends soon',
      'Your plan ends on ' || to_char(p.plan_expires_at at time zone 'America/Antigua', 'FMDay FMDD FMMonth') ||
      '. Renew to keep your listings visible to customers.', '/plan');
  end loop;
end $$;
revoke all on function public.plan_expiry_reminders() from public, anon, authenticated;
select cron.unschedule(jobid) from cron.job where jobname = 'servly-plan-expiry';
select cron.schedule('servly-plan-expiry', '0 13 * * *', 'select public.plan_expiry_reminders()');   -- 13:00 UTC = 9:00 AM Antigua

------------------------------------------------------------------------------------------------
-- 8. PAYMENTS: the same provider payment can never be counted twice (used by the payment webhook).
------------------------------------------------------------------------------------------------
create unique index if not exists payments_provider_ref_key on public.payments (provider, provider_ref) where provider_ref is not null;
-- The payment webhook (supabase/functions/payment-webhook) runs with the server key and may activate plans.
grant execute on function public.activate_plan(uuid, text, boolean, text, text) to service_role;
