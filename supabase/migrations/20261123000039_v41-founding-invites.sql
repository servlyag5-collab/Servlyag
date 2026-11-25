-- Servly AG v41: personal Founding Business invite codes, locked to one email (owner's choice, 2026-11-23).
--
--   * The owner types a business's email in Admin > Promos > Founding invites and gets a short code (e.g. SRV-7KQ4)
--     to send them, with the plan, bookings on/off and the free-trial end date (8 March 2027 filled in).
--   * The business signs up with THAT email and enters the code on the Plan screen: the free trial starts by itself
--     (the same start_free_trial rules as Admin: one trial per business, none while a paid plan is running).
--   * A code only works for the account whose email it was made for, and only once. Shared with someone else, it
--     says "This code is for a different email address."
--   * Codes are never readable from the app; the owner sees them only through the admin_* functions below.
--   * Codes use letters and digits that can't be mixed up when read out (no 0/O, 1/I/L).
--
-- Paste into Supabase > SQL Editor > Run (after v40).

begin;

create table if not exists public.founding_invites (
  code text primary key,                                   -- e.g. SRV-7KQ4
  email text not null check (email = lower(email) and email like '%@%.%'),
  tier_id text not null default 'basic' references public.tiers(id),
  booking boolean not null default false,                  -- booking app included during the trial
  trial_ends date not null,                                -- the trial ends on this day (Antigua)
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  used_by uuid references public.profiles(id) on delete set null
);
create index if not exists founding_invites_email on public.founding_invites (email);
alter table public.founding_invites enable row level security;  -- no policies: only the functions below
revoke all on public.founding_invites from anon, authenticated;

-- A short, easy-to-read code: SRV- + 4 characters.
create or replace function public.new_invite_code() returns text
language plpgsql volatile set search_path = public as $$
declare letters text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text;
begin
  loop
    c := 'SRV-' || (select string_agg(substr(letters, 1 + floor(random() * length(letters))::int, 1), '')
                      from generate_series(1, 4));
    exit when not exists (select 1 from public.founding_invites where code = c);
  end loop;
  return c;
end $$;
revoke all on function public.new_invite_code() from public, anon, authenticated;

-- Admin: make a code for one email. An unused code for the same email is replaced (only the newest works).
create or replace function public.admin_create_invite(p_email text, p_tier text default 'basic', p_booking boolean default false,
                                                      p_ends date default date '2027-03-08')
returns text language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email, ''))); c text;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please enter a valid email address.'; end if;
  if not exists (select 1 from public.tiers where id = p_tier) then raise exception 'Unknown plan.'; end if;
  if p_ends is null or p_ends <= (now() at time zone 'America/Antigua')::date
     or p_ends > (now() at time zone 'America/Antigua')::date + 365 then
    raise exception 'The trial must end between tomorrow and a year from now.';
  end if;
  delete from public.founding_invites where email = e and used_at is null;
  c := public.new_invite_code();
  insert into public.founding_invites (code, email, tier_id, booking, trial_ends, created_by)
  values (c, e, p_tier, coalesce(p_booking, false), p_ends, auth.uid());
  return c;
end $$;

-- Admin: the codes, newest first, with who used them.
create or replace function public.admin_invites()
returns table (code text, email text, tier_name text, booking boolean, trial_ends date, created_at timestamptz,
               used_at timestamptz, used_by_name text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  return query
  select i.code, i.email, t.name, i.booking, i.trial_ends, i.created_at, i.used_at,
         coalesce(nullif(p.display_name, ''), nullif(p.screen_name, ''))
    from public.founding_invites i
    join public.tiers t on t.id = i.tier_id
    left join public.profiles p on p.id = i.used_by
   order by i.created_at desc limit 200;
end $$;

-- Admin: cancel a code that hasn't been used.
create or replace function public.admin_cancel_invite(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  delete from public.founding_invites where code = upper(trim(p_code)) and used_at is null;
  if not found then raise exception 'That code was already used or doesn''t exist.'; end if;
end $$;

-- The business enters its code (Plan screen): checks the email, then starts the free trial. Returns the end time.
create or replace function public.redeem_invite(p_code text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare i public.founding_invites; me text; days int; ends timestamptz;
begin
  if auth.uid() is null then raise exception 'Please log in first.'; end if;
  select * into i from public.founding_invites
   where code = upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g')) for update;
  if not found then raise exception 'That code doesn''t exist. Check it and try again.'; end if;
  if i.used_at is not null then raise exception 'This code has already been used.'; end if;
  select lower(u.email) into me from auth.users u where u.id = auth.uid();
  if me is distinct from i.email then
    raise exception 'This code is for a different email address. Log in with the email the code was sent to.';
  end if;
  days := i.trial_ends - (now() at time zone 'America/Antigua')::date;
  if days < 1 then raise exception 'This code has expired. Please ask Servly for a new one.'; end if;
  ends := public.start_free_trial(auth.uid(), i.tier_id, least(days, 365), i.booking, 'Founding invite ' || i.code, i.created_by);
  update public.founding_invites set used_at = now(), used_by = auth.uid() where code = i.code;
  return ends;
end $$;

revoke all on function public.admin_create_invite(text, text, boolean, date) from public, anon;
revoke all on function public.admin_invites() from public, anon;
revoke all on function public.admin_cancel_invite(text) from public, anon;
revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.admin_create_invite(text, text, boolean, date) to authenticated;
grant execute on function public.admin_invites() to authenticated;
grant execute on function public.admin_cancel_invite(text) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;

commit;

-- Check: 0 codes the first time.
select count(*) as invite_codes from public.founding_invites;
