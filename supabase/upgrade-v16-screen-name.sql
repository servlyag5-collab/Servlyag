-- Servly AG v16: SCREEN NAMES.
-- Everyone has a screen name (chosen at sign-up). The business name stays in display_name.
--   * Customer view: chats and reviews you start show your SCREEN NAME.
--   * Merchant view: chats and reviews you start show your BUSINESS NAME.
-- Each chat and review remembers which one it was sent as.
-- Paste into Supabase > SQL Editor > Run (after v15). Nothing is deleted.

-- 1. The screen name. Existing users start with their current name (they can change it on Account).
alter table public.profiles add column screen_name text not null default '' check (char_length(screen_name) <= 40);
update public.profiles set screen_name = display_name where screen_name = '';
grant update (screen_name) on public.profiles to authenticated;
grant select (screen_name) on public.profiles to anon, authenticated;   -- shown on reviews, also to guests

-- 2. New accounts: the sign-up "Screen name" goes into screen_name. The business name is set later,
--    on Offer a service. (Older app versions still send display_name; that is used for both.)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare sn text := coalesce(nullif(trim(new.raw_user_meta_data->>'screen_name'), ''), new.raw_user_meta_data->>'display_name', '');
begin
  insert into public.profiles (id, display_name, screen_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''), left(sn, 40));
  return new;
end $$;

-- 3. Which name a chat / review was started with. Only people with a listing can use their business name.
alter table public.conversations add column customer_as_business boolean not null default false;
alter table public.reviews add column as_business boolean not null default false;

create function public.check_as_business() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'conversations' then
    if new.customer_as_business and not exists (select 1 from public.services where merchant_id = new.customer_id) then
      new.customer_as_business := false;
    end if;
  else
    if new.as_business and not exists (select 1 from public.services where merchant_id = new.customer_id) then
      new.as_business := false;
    end if;
  end if;
  return new;
end $$;
create trigger conversations_as_business before insert on public.conversations
  for each row execute function public.check_as_business();
create trigger reviews_as_business before insert on public.reviews
  for each row execute function public.check_as_business();

-- 4. Phone notifications for new messages use the same name the other person sees in the chat.
create or replace function public.push_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations; p public.profiles; who text; title text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  select * into p from public.profiles where id = new.sender_id;
  who := case when new.sender_id = c.customer_id and not c.customer_as_business
              then coalesce(nullif(p.screen_name, ''), nullif(p.display_name, ''), 'Servly')
              else coalesce(nullif(p.display_name, ''), nullif(p.screen_name, ''), 'Servly') end;
  title := case new.kind when 'booking_reminder' then 'Booking reminder'
                         when 'booking' then 'New booking from ' || who
                         else who end;
  perform public.send_push(case when new.sender_id = c.customer_id then c.merchant_id else c.customer_id end,
                           title, left(new.body, 140), '/chat/' || new.conversation_id);
  return new;
end $$;

-- Check: should show your users with a screen name.
select count(*) as users, count(*) filter (where screen_name <> '') as with_screen_name from public.profiles;
