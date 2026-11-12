-- Servly AG v35: deleting a listing (owner's rules, 2026-11-12). Run AFTER v34.
--
--   * The merchant (Edit listing) or an admin (Admin > Merchants) can delete a listing. It disappears for
--     everyone, frees its plan slot, and can't be brought back (no "undo", no turning it on again).
--   * Upcoming bookings for it are cancelled first, each with a message in its chat (customers get the
--     usual notification). The merchant sees how many before confirming.
--   * Reviews stay, shown on the business profile as "About: <listing> (no longer offered)", so a listing
--     can't be deleted to wipe its reviews.
--   * Chats about it stay as read-only history: nobody can send new messages or bookings there.
--   * The row is kept (marked deleted_at), so reviews, chats and receipts still make sense. Its photos are
--     removed from storage by the app when the merchant deletes it.
--   * Listings can no longer be deleted directly from the database by merchants (only through
--     delete_listing), which also stops the old way around the reviews.
--
-- Paste into Supabase > SQL Editor > Run.

------------------------------------------------------------------------------------------------
-- 1. THE MARK, AND KEEPING DELETED LISTINGS DELETED
------------------------------------------------------------------------------------------------
alter table public.services add column if not exists deleted_at timestamptz;   -- no update grant: only delete_listing sets it

-- A deleted listing stays off, whatever else updates it (turning it on, plan changes, restore, admin).
create or replace function public.keep_deleted_listings_off() returns trigger
language plpgsql as $$
begin
  if old.deleted_at is not null then
    new.deleted_at := old.deleted_at;
    new.active := false;
  end if;
  return new;
end $$;
drop trigger if exists services_keep_deleted on public.services;
create trigger services_keep_deleted before update on public.services
  for each row execute function public.keep_deleted_listings_off();

-- No more direct deletes by merchants (they would remove the listing's reviews and bookings with it).
drop policy if exists "merchant deletes" on public.services;
revoke delete on public.services from anon, authenticated;

------------------------------------------------------------------------------------------------
-- 2. CHATS AND BOOKINGS ABOUT A DELETED LISTING ARE READ-ONLY
------------------------------------------------------------------------------------------------
create or replace function public.listing_is_deleted(p_service uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select s.deleted_at is not null from public.services s where s.id = p_service), false);
$$;
revoke all on function public.listing_is_deleted(uuid) from public, anon;
grant execute on function public.listing_is_deleted(uuid) to authenticated;

create or replace function public.block_removed_listing_chat() returns trigger
language plpgsql security definer set search_path = public as $$
declare svc uuid;
begin
  if tg_table_name = 'messages' then
    select c.service_id into svc from public.conversations c where c.id = new.conversation_id;
  else
    svc := new.service_id;
  end if;
  if public.listing_is_deleted(svc) then
    raise exception 'This listing was removed, so new messages and bookings can''t be sent here.';
  end if;
  return new;
end $$;
drop trigger if exists messages_listing_removed on public.messages;
create trigger messages_listing_removed before insert on public.messages
  for each row execute function public.block_removed_listing_chat();
drop trigger if exists conversations_listing_removed on public.conversations;
create trigger conversations_listing_removed before insert on public.conversations
  for each row execute function public.block_removed_listing_chat();
drop trigger if exists bookings_listing_removed on public.bookings;
create trigger bookings_listing_removed before insert on public.bookings
  for each row execute function public.block_removed_listing_chat();

------------------------------------------------------------------------------------------------
-- 3. DELETING (merchant: own listing; admin: any listing)
------------------------------------------------------------------------------------------------
-- How many upcoming bookings deleting would cancel (shown before confirming).
create or replace function public.listing_upcoming_bookings(p_service uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare owner uuid;
begin
  select merchant_id into owner from public.services where id = p_service;
  if owner is null or (owner <> auth.uid() and not public.is_admin()) then raise exception 'Listing not found.'; end if;
  return (select count(*)::int from public.bookings b
           where b.service_id = p_service and b.status in ('pending', 'confirmed') and b.starts_at > now());
end $$;
revoke all on function public.listing_upcoming_bookings(uuid) from public, anon;
grant execute on function public.listing_upcoming_bookings(uuid) to authenticated;

-- Deletes the listing. Returns its photo paths (the app removes them from storage) and how many
-- bookings were cancelled.
create or replace function public.delete_listing(p_service uuid)
returns table (photos text[], cancelled int)
language plpgsql security definer set search_path = public as $$
declare s public.services; b public.bookings; n int := 0;
begin
  select * into s from public.services where id = p_service for update;
  if not found or (s.merchant_id <> auth.uid() and not public.is_admin()) then raise exception 'Listing not found.'; end if;
  if s.deleted_at is not null then return query select '{}'::text[], 0; return; end if;

  -- Cancel upcoming bookings first, while the chat still accepts the message.
  for b in update public.bookings set status = 'cancelled', cancelled_at = now()
            where service_id = p_service and status in ('pending', 'confirmed') and starts_at > now()
            returning *
  loop
    insert into public.messages (conversation_id, sender_id, body, kind, booking_id)
    values (b.conversation_id, b.merchant_id,
            'Cancelled the booking for ' || public.booking_when(b.starts_at) || ': this listing is no longer offered.', 'text', b.id);
    n := n + 1;
  end loop;

  update public.services set deleted_at = now(), active = false, photos = '{}', photo_focus = '{}'::jsonb where id = p_service;
  return query select coalesce(s.photos, '{}'::text[]), n;
end $$;
revoke all on function public.delete_listing(uuid) from public, anon;
grant execute on function public.delete_listing(uuid) to authenticated;

-- Titles of deleted listings, so reviews can still say "About: <listing> (no longer offered)".
create or replace function public.removed_listing_titles(p_ids uuid[]) returns table (id uuid, title text)
language sql stable security definer set search_path = public as $$
  select s.id, s.title from public.services s where s.id = any(p_ids) and s.deleted_at is not null;
$$;
revoke all on function public.removed_listing_titles(uuid[]) from public;
grant execute on function public.removed_listing_titles(uuid[]) to anon, authenticated;

-- Admin > Merchants: deleted listings are no longer listed (same as v29 otherwise).
create or replace function public.admin_merchant_listings(p_user uuid)
returns table (id uuid, title text, active boolean, paused boolean, created_at timestamptz, calls_month int, calls_total int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query select s.id, s.title, s.active, s.paused, s.created_at,
      (select count(*)::int from public.call_taps c where c.service_id = s.id and c.created_at >= public.antigua_month_start()),
      (select count(*)::int from public.call_taps c where c.service_id = s.id)
    from public.services s where s.merchant_id = p_user and s.deleted_at is null order by s.created_at desc;
end $$;

