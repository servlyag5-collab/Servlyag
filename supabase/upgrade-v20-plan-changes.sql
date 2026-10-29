-- Servly AG v20: moving to a smaller plan, and paused listings.
--
-- Moving down (e.g. Business, 4 listings -> Starter, 1 listing):
--   * On the Plan screen the merchant ticks which listings to keep (choose_listings_to_keep).
--   * If the bigger plan is still paid, the move waits until it ends; an hourly job then switches
--     the plan, pauses the listings they didn't keep, sets the booking app, and sends a notification.
--   * Paused listings are hidden from customers but kept (photos, reviews). Merchants can't pause or
--     unpause listings themselves, so they can't swap which listings are live.
-- Moving up: happens straight away. Each free slot lets the merchant bring back ONE paused listing
--   (restore_listing); once the slots are full, the choice is locked until the next plan change.
--
-- Paste into Supabase > SQL Editor > Run (after v19). No listings or data are deleted.

------------------------------------------------------------------------------------------------
-- 1. NEW COLUMNS
------------------------------------------------------------------------------------------------
-- Paused by a move to a smaller plan. Merchants have no update grant on it (only the rules below change it).
alter table public.services add column paused boolean not null default false;

-- A move down waiting for the paid month to end, and the listings the merchant chose to keep.
-- Not readable by other users (profiles columns are granted one by one); the owner uses my_plan_change().
alter table public.profiles
  add column next_tier text references public.tiers(id),
  add column next_tier_at timestamptz,
  add column next_booking boolean not null default false,
  add column keep_listings uuid[] not null default '{}';

------------------------------------------------------------------------------------------------
-- 2. CUSTOMERS NEVER SEE PAUSED LISTINGS (the merchant still sees their own)
------------------------------------------------------------------------------------------------
drop policy "services readable" on public.services;
create policy "services readable" on public.services for select to authenticated
  using (merchant_id = auth.uid() or (active and not paused and exists (
    select 1 from public.profiles p where p.id = merchant_id and p.plan_expires_at > now())));

drop policy "guests read active services" on public.services;
create policy "guests read active services" on public.services for select to anon
  using (active and not paused and exists (
    select 1 from public.profiles p where p.id = merchant_id and p.plan_expires_at > now()));

-- Search (same as v19, plus "and not s.paused").
create or replace function public.search_services(p_q text default '', p_city text default '', p_village text default '')
returns setof public.services
language sql stable security invoker set search_path = public, extensions as $$
  with q as (select lower(trim(coalesce(p_q, ''))) as t, lower(trim(coalesce(p_city, ''))) as c, lower(trim(coalesce(p_village, ''))) as v)
  select s.* from public.services s, q
  where s.active and not s.paused
    and (q.c = '' or lower(s.city) like '%' || q.c || '%' or similarity(lower(s.city), q.c) > 0.4)
    and (q.v = '' or lower(coalesce(s.village, '')) like '%' || q.v || '%' or similarity(lower(coalesce(s.village, '')), q.v) > 0.4)
    and (q.t = ''
      or lower(s.title) like '%' || q.t || '%'
      or lower(s.description) like '%' || q.t || '%'
      or word_similarity(q.t, lower(s.title)) > 0.45
      or exists (select 1 from unnest(s.tags) tag, regexp_split_to_table(q.t, '\s+') w
                 where length(w) > 1 and (
                   tag = w or tag = q.t
                   or (' ' || tag) like '% ' || w || '%'
                   or similarity(tag, w) > 0.45)))
  order by s.priority desc, s.created_at desc;
$$;

-- The listing limit counts only live listings (paused ones don't use a slot).
create or replace function public.enforce_service_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int; cnt int;
begin
  select t.max_services into lim from public.profiles p join public.tiers t on t.id = p.tier_id where p.id = new.merchant_id;
  select count(*) into cnt from public.services where merchant_id = new.merchant_id and active and not paused;
  if lim is not null and cnt >= lim then raise exception 'Your plan allows % service(s). Upgrade to add more.', lim; end if;
  return new;
end $$;

------------------------------------------------------------------------------------------------
-- 3. SWITCHING PLAN LEVEL (used by activate_plan and the hourly job; not callable from the app)
------------------------------------------------------------------------------------------------
-- Sets the plan level, the booking app (on only if the plan includes it or the add-on was paid),
-- and pauses live listings over the new limit: the chosen ones are kept, then the oldest.
-- Returns how many listings were paused.
create function public.apply_plan_change(p_user uuid, p_tier text, p_booking boolean)
returns int language plpgsql security definer set search_path = public as $$
declare t public.tiers; keep uuid[]; n int := 0;
begin
  select * into t from public.tiers where id = p_tier;
  if not found then raise exception 'unknown tier %', p_tier; end if;
  select keep_listings into keep from public.profiles where id = p_user;
  update public.profiles
     set tier_id = p_tier, next_tier = null, next_tier_at = null, next_booking = false, keep_listings = '{}'
   where id = p_user;
  update public.services set booking_enabled = (t.booking_included or p_booking) where merchant_id = p_user;
  if t.max_services is not null then
    with ranked as (
      select id, row_number() over (order by (id = any(coalesce(keep, '{}'))) desc, created_at asc) as rn
      from public.services where merchant_id = p_user and active and not paused)
    update public.services s set paused = true from ranked r where s.id = r.id and r.rn > t.max_services;
    get diagnostics n = row_count;
  end if;
  return n;
end $$;
revoke all on function public.apply_plan_change(uuid, text, boolean) from public, anon, authenticated;

------------------------------------------------------------------------------------------------
-- 4. PLAN ACTIVATION (Admin > Activate / Renew, and later the payment webhook)
------------------------------------------------------------------------------------------------
-- Same tier: one more month (as before). Bigger tier: switches straight away. Smaller tier while
-- the current plan is still paid: waits until it ends (next_tier), then the hourly job switches it.
-- Smaller tier with no paid time left: switches straight away. Any payment that isn't a move down
-- cancels a waiting move down.
create or replace function public.activate_plan(p_user uuid, p_tier text, p_booking boolean default false,
                                                p_provider text default 'manual', p_ref text default null)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tiers; cur public.tiers; pr public.profiles; a numeric; amt numeric; want boolean; still_paid boolean;
begin
  select * into t from public.tiers where id = p_tier;
  if not found then raise exception 'unknown tier %', p_tier; end if;
  select * into pr from public.profiles where id = p_user for update;
  if not found then raise exception 'unknown merchant %', p_user; end if;
  select * into cur from public.tiers where id = pr.tier_id;
  select monthly_price into a from public.addons where id = 'booking';
  want := (p_booking or coalesce(pr.booking_requested, false)) and not t.booking_included;
  amt := t.monthly_price + case when want then a else 0 end;
  still_paid := pr.plan_expires_at is not null and pr.plan_expires_at > now();

  if still_paid and t.priority_rank < cur.priority_rank then
    -- Moving down: keep the bigger plan until its paid month ends; the new month follows it.
    update public.profiles
       set next_tier = p_tier, next_tier_at = pr.plan_expires_at, next_booking = want, requested_tier = null,
           plan_expires_at = pr.plan_expires_at + interval '1 month'
     where id = p_user;
  else
    update public.profiles
       set requested_tier = null, next_tier = null, next_tier_at = null, next_booking = false,
           keep_listings = case when p_tier = pr.tier_id then '{}' else keep_listings end,
           plan_expires_at = greatest(coalesce(plan_expires_at, now()), now()) + interval '1 month'
     where id = p_user;
    if p_tier <> pr.tier_id then
      perform public.apply_plan_change(p_user, p_tier, want);
    elsif t.booking_included or want then
      update public.services set booking_enabled = true where merchant_id = p_user;
    end if;
  end if;

  insert into public.payments (merchant_id, tier_id, amount, booking_addon, provider, provider_ref)
  values (p_user, p_tier, amt, want, p_provider, p_ref);
end $$;
revoke all on function public.activate_plan(uuid, text, boolean, text, text) from public, anon, authenticated;
grant execute on function public.activate_plan(uuid, text, boolean, text, text) to service_role;

------------------------------------------------------------------------------------------------
-- 5. WHAT MERCHANTS CAN DO (from the app)
------------------------------------------------------------------------------------------------
-- Plan screen: before moving to a smaller plan, choose which live listings to keep.
-- They must choose exactly as many as the plan allows (or all of them, if they have fewer).
create function public.choose_listings_to_keep(p_tier text, p_keep uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare lim int; live int; k uuid[];
begin
  if auth.uid() is null then raise exception 'Please log in.'; end if;
  select max_services into lim from public.tiers where id = p_tier;
  if not found then raise exception 'Unknown plan.'; end if;
  select coalesce(array_agg(distinct x), '{}') into k from unnest(coalesce(p_keep, '{}')) x;
  if exists (select 1 from unnest(k) x where not exists (
      select 1 from public.services s where s.id = x and s.merchant_id = auth.uid() and s.active and not s.paused)) then
    raise exception 'You can only keep your own live listings.';
  end if;
  select count(*) into live from public.services where merchant_id = auth.uid() and active and not paused;
  if lim is not null and cardinality(k) <> least(lim, live) then
    raise exception 'Please choose % listing(s) to keep.', least(lim, live);
  end if;
  update public.profiles set keep_listings = k where id = auth.uid();
end $$;
revoke all on function public.choose_listings_to_keep(text, uuid[]) from public, anon;
grant execute on function public.choose_listings_to_keep(text, uuid[]) to authenticated;

-- Account: bring back one paused listing, only while the plan has a free slot.
create function public.restore_listing(p_service uuid)
returns void language plpgsql security definer set search_path = public as $$
declare pr public.profiles; lim int; live int;
begin
  select * into pr from public.profiles where id = auth.uid() for update; -- one at a time
  if not found then raise exception 'Please log in.'; end if;
  if not exists (select 1 from public.services where id = p_service and merchant_id = auth.uid() and paused) then
    raise exception 'This listing is not paused.';
  end if;
  if pr.plan_expires_at is null or pr.plan_expires_at <= now() then raise exception 'Your plan has ended. Renew it first.'; end if;
  if pr.next_tier is not null then raise exception 'You are moving to a smaller plan, so paused listings can''t come back now.'; end if;
  select max_services into lim from public.tiers where id = pr.tier_id;
  select count(*) into live from public.services where merchant_id = auth.uid() and active and not paused;
  if lim is not null and live >= lim then
    raise exception 'Your plan allows % live listing(s). Upgrade to bring this one back.', lim;
  end if;
  update public.services set paused = false where id = p_service;
end $$;
revoke all on function public.restore_listing(uuid) from public, anon;
grant execute on function public.restore_listing(uuid) to authenticated;

-- The merchant's own waiting move down (shown on the Plan screen and Account).
create function public.my_plan_change()
returns table (next_tier text, next_tier_name text, next_tier_at timestamptz, keep_listings uuid[])
language sql stable security definer set search_path = public as $$
  select p.next_tier, t.name, p.next_tier_at, p.keep_listings
  from public.profiles p left join public.tiers t on t.id = p.next_tier where p.id = auth.uid();
$$;
revoke all on function public.my_plan_change() from public, anon;
grant execute on function public.my_plan_change() to authenticated;

------------------------------------------------------------------------------------------------
-- 6. THE HOURLY JOB: switches every move down whose paid month has ended
------------------------------------------------------------------------------------------------
create function public.apply_due_plan_changes()
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int; done int := 0; tname text;
begin
  for r in select id, next_tier, next_booking from public.profiles
           where next_tier is not null and next_tier_at <= now() for update skip locked loop
    n := public.apply_plan_change(r.id, r.next_tier, r.next_booking);
    select name into tname from public.tiers where id = r.next_tier;
    perform public.send_push(r.id, 'Your plan is now ' || tname,
      case when n = 0 then 'All your listings are still live.'
           when n = 1 then '1 listing is paused. Upgrade any time to bring it back.'
           else n || ' listings are paused. Upgrade any time to bring them back.' end,
      '/account');
    done := done + 1;
  end loop;
  return done;
end $$;
revoke all on function public.apply_due_plan_changes() from public, anon, authenticated;

-- Every hour, 5 minutes past.
select cron.schedule('servly-plan-changes', '5 * * * *', 'select public.apply_due_plan_changes()');

-- Check: should show paused | boolean, and the new job.
select (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'services' and column_name = 'paused') as paused_column,
       (select schedule from cron.job where jobname = 'servly-plan-changes') as plan_change_job;
