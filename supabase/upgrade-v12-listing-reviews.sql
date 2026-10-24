-- Servly AG v12: reviews belong to a LISTING, not the whole business.
-- A customer can review each listing once, after messaging about that listing.
-- The business profile still shows all of a business's reviews together.
-- Run this AFTER upgrade-v11-price-from.sql (Supabase > SQL Editor). Nothing is deleted.

-- 1. Which listing a review is about.
alter table public.reviews add column service_id uuid references public.services(id) on delete cascade;

-- Existing reviews move to the listing the customer messaged about (their most recent chat with that business);
-- if there is none, to that business's first listing.
update public.reviews r set service_id = (
  select c.service_id from public.conversations c
  where c.customer_id = r.customer_id and c.merchant_id = r.merchant_id
  order by c.last_message_at desc limit 1)
where r.service_id is null;
update public.reviews r set service_id = (
  select s.id from public.services s where s.merchant_id = r.merchant_id order by s.created_at limit 1)
where r.service_id is null;

-- 2. One review per customer per LISTING (was: per business).
alter table public.reviews drop constraint if exists reviews_merchant_id_customer_id_key;
alter table public.reviews add constraint reviews_service_customer_key unique (service_id, customer_id);
create index reviews_service_idx on public.reviews (service_id, created_at desc);

-- 3. The business always comes from the listing (never from the app).
create function public.set_review_merchant() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.service_id is null then raise exception 'Choose the listing you are reviewing.'; end if;
  select merchant_id into new.merchant_id from public.services where id = new.service_id;
  if new.merchant_id is null then raise exception 'Listing not found'; end if;
  return new;
end $$;
create trigger reviews_merchant before insert on public.reviews
  for each row execute function public.set_review_merchant();

-- 4. Only real customers of THAT listing can review it: someone who has messaged about it.
drop policy "real customers review once" on public.reviews;
create policy "real customers review each listing once" on public.reviews for insert to authenticated
  with check (customer_id = auth.uid() and exists (
    select 1 from public.conversations c
    where c.customer_id = auth.uid() and c.service_id = reviews.service_id and c.last_message <> ''));

-- 5. Average stars and number of reviews per listing (merchant_ratings stays for the whole business).
create view public.service_ratings with (security_invoker = true) as
  select service_id, round(avg(rating)::numeric, 1) as average, count(*)::int as total
  from public.reviews where service_id is not null group by service_id;
grant select on public.service_ratings to anon, authenticated;
