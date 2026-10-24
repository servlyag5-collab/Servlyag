-- Servly AG v13: the booking app.
-- Merchants with the booking app (Business tier, or the paid add-on) book a customer from their chat;
-- the customer confirms or declines; the merchant can cancel. Confirmed bookings get reminder
-- messages in the chat 5 days and 3 days before (9:00 AM Antigua time) and on the day
-- (7:00 AM, or 2 hours before if the booking is earlier than 9:00 AM).
-- Run this AFTER upgrade-v12-listing-reviews.sql (Supabase > SQL Editor). Nothing is deleted.
-- Supabase will warn about "destructive operations": that's the old message-kind rule being
-- replaced by a wider one (step 4). No data is removed.

-- 0. Supabase's built-in scheduler, used for the reminders.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;

-- 1. Who has the booking app: Business tier with an active plan, a booking add-on paid in the last
--    month, or booking switched on by you for one of their listings.
create function public.merchant_has_booking(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p join public.tiers t on t.id = p.tier_id
                 where p.id = p_uid and t.booking_included and p.plan_expires_at > now())
      or exists (select 1 from public.payments where merchant_id = p_uid and booking_addon and paid_at > now() - interval '32 days')
      or exists (select 1 from public.services where merchant_id = p_uid and booking_enabled);
$$;
revoke all on function public.merchant_has_booking(uuid) from public, anon, authenticated;

create function public.has_booking_app() returns boolean
language sql stable security definer set search_path = public as $$ select public.merchant_has_booking(auth.uid()); $$;
revoke all on function public.has_booking_app() from public, anon;
grant execute on function public.has_booking_app() to authenticated;

-- Fix: listings created AFTER the booking add-on was paid now get booking switched on too.
create or replace function public.set_service_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select t.priority_rank, t.booking_included or public.merchant_has_booking(new.merchant_id)
    into new.priority, new.booking_enabled
  from public.profiles p join public.tiers t on t.id = p.tier_id where p.id = new.merchant_id;
  return new;
end $$;
update public.services s set booking_enabled = true
 where not s.booking_enabled and public.merchant_has_booking(s.merchant_id);

-- 2. Bookings. One per booking request; it belongs to a chat (customer + listing).
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,     -- set from the chat
  merchant_id uuid not null references public.profiles(id) on delete cascade,    -- set from the chat
  customer_id uuid not null references public.profiles(id) on delete cascade,    -- set from the chat
  starts_at timestamptz not null,
  note text not null default '' check (char_length(note) <= 500),
  price numeric(10,2),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  responded_at timestamptz,
  cancelled_at timestamptz,
  reminders_sent text[] not null default '{}',                                 -- '5d', '3d', 'day'
  created_at timestamptz not null default now()
);
create index bookings_merchant_idx on public.bookings (merchant_id, starts_at);
create index bookings_customer_idx on public.bookings (customer_id, starts_at);
create index bookings_conversation_idx on public.bookings (conversation_id);

-- "Monday 3 November 2026, 2:00 PM" in Antigua time.
create function public.booking_when(ts timestamptz) returns text
language sql stable as $$ select to_char(ts at time zone 'America/Antigua', 'FMDay FMDD FMMonth YYYY, FMHH12:MI AM'); $$;

-- 3. Messages can carry a booking: the booking card, and reminders.
alter table public.messages add column booking_id uuid references public.bookings(id) on delete set null;
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check
  check (kind in ('text', 'review_request', 'booking', 'booking_reminder'));

-- Only the merchant can ask for a review; booking cards and reminders come only from the app itself.
create or replace function public.check_review_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'review_request' and not exists (
    select 1 from public.conversations c where c.id = new.conversation_id and c.merchant_id = new.sender_id) then
    raise exception 'Only the merchant can ask for a review.';
  end if;
  if new.kind in ('booking', 'booking_reminder') and coalesce(current_setting('servly.system', true), '') <> 'on' then
    raise exception 'Booking messages are sent by the app.';
  end if;
  return new;
end $$;

-- 4. A new booking: parties come from the chat; only merchants with the booking app; must be in the future.
create function public.set_booking_parties() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if not found then raise exception 'Conversation not found'; end if;
  new.service_id := c.service_id; new.merchant_id := c.merchant_id; new.customer_id := c.customer_id;
  new.status := 'pending'; new.reminders_sent := '{}'; new.responded_at := null; new.cancelled_at := null;
  if not public.merchant_has_booking(c.merchant_id) then raise exception 'The booking app is not switched on for this business.'; end if;
  if new.starts_at <= now() then raise exception 'Choose a date and time in the future.'; end if;
  return new;
end $$;
create trigger bookings_parties before insert on public.bookings
  for each row execute function public.set_booking_parties();

-- ...and it appears in the chat as a booking card for the customer to confirm.
create function public.post_booking_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('servly.system', 'on', true);
  insert into public.messages (conversation_id, sender_id, body, kind, booking_id)
  values (new.conversation_id, new.merchant_id, 'Booking request: ' || public.booking_when(new.starts_at) || '. Please confirm.', 'booking', new.id);
  perform set_config('servly.system', 'off', true);
  return new;
end $$;
create trigger bookings_message after insert on public.bookings
  for each row execute function public.post_booking_message();

alter table public.bookings enable row level security;
create policy "participants read bookings" on public.bookings for select to authenticated
  using (auth.uid() in (customer_id, merchant_id));
create policy "merchant creates bookings" on public.bookings for insert to authenticated
  with check (merchant_id = auth.uid());
revoke update, delete on public.bookings from anon, authenticated;   -- changes go through the functions below

-- 5. The customer confirms or declines a pending booking.
create function public.respond_booking(p_booking uuid, p_confirm boolean) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  update public.bookings set status = case when p_confirm then 'confirmed' else 'declined' end, responded_at = now()
   where id = p_booking and customer_id = auth.uid() and status = 'pending' and starts_at > now()
   returning * into b;
  if not found then raise exception 'This booking can no longer be answered.'; end if;
  insert into public.messages (conversation_id, sender_id, body, kind, booking_id)
  values (b.conversation_id, b.customer_id,
          case when p_confirm then 'Confirmed the booking for ' else 'Declined the booking for ' end || public.booking_when(b.starts_at) || '.',
          'text', b.id);
end $$;
revoke all on function public.respond_booking(uuid, boolean) from public, anon;
grant execute on function public.respond_booking(uuid, boolean) to authenticated;

-- 6. The merchant cancels a pending or confirmed booking that hasn't happened yet.
create function public.cancel_booking(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  update public.bookings set status = 'cancelled', cancelled_at = now()
   where id = p_booking and merchant_id = auth.uid() and status in ('pending', 'confirmed') and starts_at > now()
   returning * into b;
  if not found then raise exception 'This booking can no longer be cancelled.'; end if;
  insert into public.messages (conversation_id, sender_id, body, kind, booking_id)
  values (b.conversation_id, b.merchant_id, 'Cancelled the booking for ' || public.booking_when(b.starts_at) || '.', 'text', b.id);
end $$;
revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;

-- 7. Reminders for confirmed bookings, posted in the chat (from the merchant) every 15 minutes as they fall due:
--    5 and 3 days before at 9:00 AM; on the day at 7:00 AM (or 2 hours before if earlier). A 5- or 3-day
--    reminder whose day has already passed (booked late) is skipped quietly.
create function public.send_booking_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare
  b record;
  local_now timestamp := now() at time zone 'America/Antigua';
  start_local timestamp; d date; due timestamp; which text; msg text;
begin
  perform set_config('servly.system', 'on', true);
  for b in
    select bk.*, s.title, p.display_name
    from public.bookings bk join public.services s on s.id = bk.service_id join public.profiles p on p.id = bk.merchant_id
    where bk.status = 'confirmed' and bk.starts_at > now() and bk.starts_at < now() + interval '6 days'
  loop
    start_local := b.starts_at at time zone 'America/Antigua';
    d := start_local::date;
    foreach which in array array['5d', '3d', 'day'] loop
      continue when which = any(b.reminders_sent);
      due := case which when '5d' then (d - 5) + time '09:00'
                        when '3d' then (d - 3) + time '09:00'
                        else least(d + time '07:00', start_local - interval '2 hours') end;
      continue when local_now < due;
      if which <> 'day' and local_now >= due + interval '1 day' then
        update public.bookings set reminders_sent = reminders_sent || which where id = b.id;
        continue;
      end if;
      msg := 'Reminder: your ' || b.title || ' booking with ' || coalesce(nullif(b.display_name, ''), 'your merchant') || ' is '
          || case which when '5d' then 'in 5 days' when '3d' then 'in 3 days' else 'today' end
          || ', ' || public.booking_when(b.starts_at) || '.';
      insert into public.messages (conversation_id, sender_id, body, kind, booking_id)
      values (b.conversation_id, b.merchant_id, msg, 'booking_reminder', b.id);
      update public.bookings set reminders_sent = reminders_sent || which where id = b.id;
    end loop;
  end loop;
  perform set_config('servly.system', 'off', true);
end $$;
revoke all on function public.send_booking_reminders() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'servly-booking-reminders';
select cron.schedule('servly-booking-reminders', '*/15 * * * *', 'select public.send_booking_reminders()');

-- 8. Live updates: booking cards change as soon as the customer answers or the merchant cancels.
alter publication supabase_realtime add table public.bookings;
