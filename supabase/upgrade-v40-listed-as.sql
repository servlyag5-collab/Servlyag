-- Servly AG v40: "Listed as": an optional name per listing (owner's choice, 2026-11-18). A merchant with a side
-- business (e.g. a photographer who also cuts lawns) can show one listing under another name ("Green Cut by Jojo")
-- while their other listings keep the main business name. Empty = the business name, as before.
--
--   * services.listed_as: optional, up to 60 characters. Merchants set it on Offer a service / Edit listing.
--   * Customers see it wherever that listing's business name shows (listing page, Home cards, chats, bookings,
--     reviews, and the chat notification title). The business profile, "About" and receipts keep the main name.
--   * Search is unchanged: merchants add the other name to the listing's search tags if they want it searchable.
--
-- Paste into Supabase > SQL Editor > Run (after v39). Nothing changes until a merchant fills it in.

begin;

alter table public.services add column if not exists listed_as text;
alter table public.services drop constraint if exists services_listed_as_length;
alter table public.services add constraint services_listed_as_length check (listed_as is null or char_length(listed_as) <= 60);
grant update (listed_as) on public.services to authenticated;

-- Chat notifications: a reply from the merchant shows the listing's "Listed as" name when it has one.
-- Same as v34 otherwise (messages channel = Sound 1).
create or replace function public.push_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations; p public.profiles; who text; title text; listed text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  select * into p from public.profiles where id = new.sender_id;
  select nullif(trim(s.listed_as), '') into listed from public.services s where s.id = c.service_id;
  who := case when new.sender_id = c.customer_id and not c.customer_as_business
              then coalesce(nullif(p.screen_name, ''), nullif(p.display_name, ''), 'Servly')
              when new.sender_id = c.merchant_id and listed is not null then listed
              else coalesce(nullif(p.display_name, ''), nullif(p.screen_name, ''), 'Servly') end;
  title := case new.kind when 'booking_reminder' then 'Booking reminder'
                         when 'booking' then 'New booking from ' || who
                         else who end;
  perform public.send_push(case when new.sender_id = c.customer_id then c.merchant_id else c.customer_id end,
                           title, left(new.body, 140), '/chat/' || new.conversation_id, 'messages');
  return new;
end $$;

commit;

-- Check: the new column (no listing uses it yet).
select count(*) filter (where listed_as is not null) as listings_with_listed_as from public.services;
