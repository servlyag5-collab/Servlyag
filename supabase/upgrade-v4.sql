-- Servly AG v4: notes inbox, photos, plans and payments.
-- Run this AFTER schema.sql (Supabase > SQL Editor).

-- 1. Notes inbox: merchants can mark notes as read
alter table public.notes add column read_at timestamptz;
create policy "merchant marks notes read" on public.notes for update to authenticated
  using (exists (select 1 from public.services s where s.id = service_id and s.merchant_id = auth.uid()));
revoke update on public.notes from anon, authenticated;
grant update (read_at) on public.notes to authenticated;

-- 2. Photos: up to 5 per service, stored in a public bucket under <merchant id>/<service id>/
alter table public.services add column photos text[] not null default '{}' check (cardinality(photos) <= 5);
grant update (photos) on public.services to authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('service-photos', 'service-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do nothing;
create policy "service photos public read" on storage.objects for select using (bucket_id = 'service-photos');
create policy "merchants upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'service-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "merchants delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'service-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Plans and payments
create table public.addons (
  id text primary key, name text not null, monthly_price numeric(10,2) not null, currency text not null default 'XCD'
);
insert into public.addons values ('booking', 'Booking app', 25, 'XCD');
alter table public.addons enable row level security;
create policy "addons readable" on public.addons for select to authenticated using (true);

alter table public.profiles add column plan_expires_at timestamptz;                  -- null = no active plan
alter table public.profiles add column requested_tier text references public.tiers(id);
grant update (requested_tier) on public.profiles to authenticated;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  tier_id text not null references public.tiers(id),
  amount numeric(10,2) not null,
  currency text not null default 'XCD',
  booking_addon boolean not null default false,
  provider text not null default 'manual',
  provider_ref text,
  paid_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create policy "own payments" on public.payments for select to authenticated using (merchant_id = auth.uid());

-- Call this when a merchant has paid (by hand now; a payment webhook will call it later).
-- Adds one month, sets the tier, switches on booking where it was paid for or included.
create function public.activate_plan(p_user uuid, p_tier text, p_booking boolean default false,
                                     p_provider text default 'manual', p_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tiers; a numeric; amt numeric;
begin
  select * into t from public.tiers where id = p_tier;
  if not found then raise exception 'unknown tier %', p_tier; end if;
  select monthly_price into a from public.addons where id = 'booking';
  amt := t.monthly_price + case when p_booking and not t.booking_included then a else 0 end;
  update public.profiles
     set tier_id = p_tier, requested_tier = null,
         plan_expires_at = greatest(coalesce(plan_expires_at, now()), now()) + interval '1 month'
   where id = p_user;
  if t.booking_included or p_booking then
    update public.services set booking_enabled = true where merchant_id = p_user and (t.booking_included or booking_requested);
  end if;
  insert into public.payments (merchant_id, tier_id, amount, booking_addon, provider, provider_ref)
  values (p_user, p_tier, amt, p_booking and not t.booking_included, p_provider, p_ref);
end $$;
revoke all on function public.activate_plan(uuid, text, boolean, text, text) from public, anon, authenticated;

-- Listings are visible to customers only while the merchant's plan is active.
drop policy "services readable" on public.services;
create policy "services readable" on public.services for select to authenticated
  using (merchant_id = auth.uid() or (active and exists (
    select 1 from public.profiles p where p.id = merchant_id and p.plan_expires_at > now())));

-- To test: activate yourself.  select public.activate_plan('YOUR-USER-ID', 'basic');
