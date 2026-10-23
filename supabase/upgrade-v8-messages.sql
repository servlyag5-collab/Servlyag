-- Servly AG v8: two-way messages. One conversation per customer per listing; both sides can reply.
-- Run this AFTER upgrade-v7-tier-order.sql (Supabase > SQL Editor).
-- Existing notes are copied in as the first messages. The old notes table is left in place, untouched.

-- 1. Tables
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  merchant_id uuid not null references public.profiles(id) on delete cascade, -- set by trigger from the listing
  contact text,                                   -- optional customer phone / WhatsApp
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message text not null default '',          -- preview for the Messages list
  customer_read_at timestamptz,
  merchant_read_at timestamptz,
  unique (service_id, customer_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index conversations_customer_idx on public.conversations (customer_id, last_message_at desc);
create index conversations_merchant_idx on public.conversations (merchant_id, last_message_at desc);

-- 2. The merchant always comes from the listing (never from the app), and nobody can message their own listing.
create function public.set_conversation_merchant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select merchant_id into new.merchant_id from public.services where id = new.service_id;
  if new.merchant_id is null then raise exception 'Listing not found'; end if;
  if new.merchant_id = new.customer_id then raise exception 'You cannot message your own listing.'; end if;
  return new;
end $$;
create trigger conversations_merchant before insert on public.conversations
  for each row execute function public.set_conversation_merchant();

-- 3. Each new message updates the conversation preview and marks it read for the sender.
create function public.on_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations c set
    last_message    = case when new.created_at >= c.last_message_at then left(new.body, 140) else c.last_message end,
    last_message_at = greatest(c.last_message_at, new.created_at),
    customer_read_at = case when new.sender_id = c.customer_id then greatest(coalesce(c.customer_read_at, new.created_at), new.created_at) else c.customer_read_at end,
    merchant_read_at = case when new.sender_id = c.merchant_id then greatest(coalesce(c.merchant_read_at, new.created_at), new.created_at) else c.merchant_read_at end
  where c.id = new.conversation_id;
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_new_message();

-- 4. Opening a conversation marks it read for whoever opened it.
create function public.mark_conversation_read(p_conv uuid) returns void
language sql security definer set search_path = public as $$
  update public.conversations set
    customer_read_at = case when customer_id = auth.uid() then now() else customer_read_at end,
    merchant_read_at = case when merchant_id = auth.uid() then now() else merchant_read_at end
  where id = p_conv and auth.uid() in (customer_id, merchant_id);
$$;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- 5. Security: only the customer and that listing's merchant can see or write a conversation.
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "participants read conversations" on public.conversations for select to authenticated
  using (auth.uid() in (customer_id, merchant_id));
create policy "customer starts conversation" on public.conversations for insert to authenticated
  with check (customer_id = auth.uid());
revoke update on public.conversations from anon, authenticated;
grant update (contact) on public.conversations to authenticated;          -- read markers go through mark_conversation_read
create policy "customer updates own contact" on public.conversations for update to authenticated
  using (customer_id = auth.uid());

create policy "participants read messages" on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.customer_id, c.merchant_id)));
create policy "participants send messages" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (
    select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.customer_id, c.merchant_id)));
revoke update, delete on public.messages from anon, authenticated;

-- 6. Live updates: new messages appear instantly in an open chat (security rules still apply).
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- 7. Copy existing notes in: one conversation per customer + listing, each note as a message.
insert into public.conversations (service_id, customer_id, merchant_id, contact, created_at, last_message_at, last_message, customer_read_at, merchant_read_at)
select n.service_id, n.customer_id, s.merchant_id,
       (array_agg(n.contact order by n.created_at desc))[1],
       min(n.created_at), max(n.created_at),
       left((array_agg(n.body order by n.created_at desc))[1], 140),
       max(n.created_at),
       case when bool_and(n.read_at is not null) then max(n.read_at) end
from public.notes n join public.services s on s.id = n.service_id
where s.merchant_id <> n.customer_id
group by n.service_id, n.customer_id, s.merchant_id
on conflict (service_id, customer_id) do nothing;

insert into public.messages (conversation_id, sender_id, body, created_at)
select c.id, n.customer_id, n.body, n.created_at
from public.notes n join public.conversations c on c.service_id = n.service_id and c.customer_id = n.customer_id;
