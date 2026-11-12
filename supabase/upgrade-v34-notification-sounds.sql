-- Servly AG v34: notifications pop up on screen, with two sounds (owner's choice, 2026-11-12).
--
--   * "messages" (Sound 1): chat replies, booking requests/answers and booking reminders (all are chat messages).
--   * "updates"  (Sound 2): everything else: plan and payment notices, trial ending, and later Servly news/promos.
--
-- Every notification is now sent as HIGH priority with its channel, so Android phones pop it up on screen
-- and play that channel's sound (the sounds themselves are in the app: assets/sounds, new build needed).
-- Older app builds without these channels still get the notification, with the phone's default sound.
-- Only the sending changes: no tables, no data. Paste into Supabase > SQL Editor > Run (after v33).

-- One send_push with a channel (default "updates"), so every existing caller keeps working unchanged.
drop function if exists public.send_push(uuid, text, text, text);
create or replace function public.send_push(p_user uuid, p_title text, p_body text, p_url text, p_channel text default 'updates')
returns void language plpgsql security definer set search_path = public, extensions as $$
declare msgs jsonb;
begin
  select jsonb_agg(jsonb_build_object('to', token, 'title', p_title, 'body', p_body, 'sound', 'default',
                                      'priority', 'high', 'channelId', coalesce(p_channel, 'updates'),
                                      'data', jsonb_build_object('url', p_url)))
    into msgs from public.push_tokens where user_id = p_user;
  if msgs is null then return; end if;
  perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := msgs,
                        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
exception when others then
  null;   -- a failed notification must never stop a message or booking
end $$;
revoke all on function public.send_push(uuid, text, text, text, text) from public, anon, authenticated;

-- Chat messages (and booking cards and reminders, which are chat messages) use Sound 1. Same as v16 otherwise.
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
                           title, left(new.body, 140), '/chat/' || new.conversation_id, 'messages');
  return new;
end $$;

-- Check: one send_push, with the channel.
select pg_get_function_identity_arguments(oid) as send_push_arguments from pg_proc where proname = 'send_push';
