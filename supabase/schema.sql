-- Servly AG (v3: your three tiers). Paste into Supabase > SQL Editor > Run.
-- If you ran an earlier version, run this block FIRST to start clean:
--   drop table if exists public.requests, public.notes, public.services, public.profiles, public.tiers cascade;
--   drop function if exists public.handle_new_user(), public.enforce_service_limit(), public.set_service_flags(), public.sync_tier_flags() cascade;
create extension if not exists pgcrypto;

-- Only YOU can change tiers (Supabase dashboard). Tier id = page layout key in the app.
create table public.tiers (
  id text primary key,
  name text not null,
  monthly_price numeric(10,2) not null,
  currency text not null default 'XCD',
  max_services int,                         -- null = unlimited
  priority_rank int not null default 0,     -- higher shows first in search
  booking_included boolean not null default false
);
insert into public.tiers (id, name, monthly_price, max_services, priority_rank, booking_included) values
  ('basic',   'Starter', 50, 1,    0, false),
  ('plus',    'Growth', 100, 2,    1, false),
  ('premium', 'Business', 150, null, 1, true);

create table public.profiles (               -- the public business profile
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  bio text not null default '',
  phone text,                                -- customers can call / WhatsApp this number
  tier_id text not null default 'basic' references public.tiers(id),
  created_at timestamptz not null default now()
);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  price numeric(10,2),
  city text not null,
  village text,
  active boolean not null default true,
  priority int not null default 0,                   -- set by trigger from the tier
  booking_requested boolean not null default false,  -- merchant ticks the add-on box
  booking_enabled boolean not null default false,    -- Tier 3 automatically; add-on once you approve it
  created_at timestamptz not null default now()
);
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  contact text not null,
  created_at timestamptz not null default now()
);
create index services_search_idx on public.services (priority desc, created_at desc);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.enforce_service_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int; cnt int;
begin
  select t.max_services into lim from public.profiles p join public.tiers t on t.id = p.tier_id where p.id = new.merchant_id;
  select count(*) into cnt from public.services where merchant_id = new.merchant_id and active;
  if lim is not null and cnt >= lim then raise exception 'Your plan allows % service(s). Upgrade to add more.', lim; end if;
  return new;
end $$;
create trigger services_limit before insert on public.services for each row execute function public.enforce_service_limit();

-- Priority placement and the free booking app come from the tier, never from the merchant.
create function public.set_service_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select t.priority_rank, t.booking_included into new.priority, new.booking_enabled
  from public.profiles p join public.tiers t on t.id = p.tier_id where p.id = new.merchant_id;
  return new;
end $$;
create trigger services_flags before insert on public.services for each row execute function public.set_service_flags();

-- When you move a merchant to another tier, their services follow.
-- (Downgrades keep booking_enabled as is: switch it off by hand if they have no add-on.)
create function public.sync_tier_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.services s set priority = t.priority_rank, booking_enabled = (s.booking_enabled or t.booking_included)
  from public.tiers t where t.id = new.tier_id and s.merchant_id = new.id;
  return new;
end $$;
create trigger profiles_tier_changed after update of tier_id on public.profiles
  for each row when (old.tier_id is distinct from new.tier_id) execute function public.sync_tier_flags();

alter table public.tiers enable row level security;
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.notes enable row level security;

create policy "tiers readable" on public.tiers for select to authenticated using (true);
create policy "profiles readable" on public.profiles for select to authenticated using (true);
revoke update on public.profiles from anon, authenticated;
grant update (display_name, bio, phone) on public.profiles to authenticated;   -- never tier_id
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create policy "services readable" on public.services for select to authenticated using (active or merchant_id = auth.uid());
create policy "merchant inserts" on public.services for insert to authenticated with check (merchant_id = auth.uid());
create policy "merchant updates" on public.services for update to authenticated using (merchant_id = auth.uid());
create policy "merchant deletes" on public.services for delete to authenticated using (merchant_id = auth.uid());
revoke update on public.services from anon, authenticated;
grant update (title, description, tags, price, city, village, active, booking_requested) on public.services to authenticated;

create policy "customer creates note" on public.notes for insert to authenticated with check (customer_id = auth.uid());
create policy "customer or merchant reads notes" on public.notes for select to authenticated
  using (customer_id = auth.uid() or exists (select 1 from public.services s where s.id = service_id and s.merchant_id = auth.uid()));

-- Move a merchant to another tier (you, in the SQL editor):
--   update public.profiles set tier_id = 'plus' where id = 'MERCHANT-USER-ID';
-- Approve the booking add-on for a Tier 1/2 service once they have paid:
--   update public.services set booking_enabled = true where id = 'SERVICE-ID';
