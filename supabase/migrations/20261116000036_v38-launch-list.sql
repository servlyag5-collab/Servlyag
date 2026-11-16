-- Servly AG v38: the launch list (owner's choice, 2026-11-16). The public "Coming soon" page on servlyag.com lets
-- customers and businesses ask to be told when Servly opens. Sign-ups are kept here (not in Netlify).
--
--   * launch_signups: name, contact (WhatsApp number or email), kind (customer / business), consent, when.
--     Only used to send the launch notice (Data Protection Act 2013); delete a row whenever someone asks.
--   * Nobody can read the list from the website or the app. Admins read it (Supabase > Table Editor, or the
--     SQL at the bottom). Visitors can only ADD themselves, through join_launch_list().
--   * One row per contact: signing up again with the same number/email updates the row instead of adding one.
--   * Spam brakes: names and contacts are length-checked, consent must be ticked, and if more than 40 sign-ups
--     arrive in one minute the page is asked to try again later.
--
-- Paste into Supabase > SQL Editor > Run (after v37). Nothing changes in the app.

begin;

create table if not exists public.launch_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  contact text not null check (char_length(contact) between 5 and 120),
  contact_key text not null unique,                     -- the contact in a standard form, to spot repeats
  kind text not null check (kind in ('customer', 'business')),
  consent boolean not null check (consent),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notified_at timestamptz                               -- fill in when the launch notice has been sent
);
alter table public.launch_signups enable row level security;
revoke all on public.launch_signups from anon, authenticated;
drop policy if exists "admins read the launch list" on public.launch_signups;
create policy "admins read the launch list" on public.launch_signups for select to authenticated using (public.is_admin());
grant select on public.launch_signups to authenticated;   -- the policy above lets only admins see rows

-- Add or update one sign-up. Returns 'added' or 'updated'.
create or replace function public.join_launch_list(p_name text, p_contact text, p_kind text, p_consent boolean)
returns text language plpgsql security definer set search_path = public as $$
declare n text := left(trim(coalesce(p_name, '')), 80);
        c text := left(trim(coalesce(p_contact, '')), 120);
        k text;
        existed boolean;
begin
  if not coalesce(p_consent, false) then raise exception 'Please tick the box so we can tell you when Servly opens.'; end if;
  if n = '' then raise exception 'Please enter your name.'; end if;
  if p_kind not in ('customer', 'business') then raise exception 'Please choose customer or business.'; end if;
  -- An email (has @ and a dot after it) or a phone number (7 to 15 digits).
  if c like '%@%.%' and c !~ '\s' then
    k := lower(c);
  elsif length(regexp_replace(c, '\D', '', 'g')) between 7 and 15 then
    k := regexp_replace(c, '\D', '', 'g');
    if length(k) = 7 then k := '1268' || k; end if;      -- local numbers get the Antigua code
  else
    raise exception 'Please enter a WhatsApp number or an email address.';
  end if;
  if (select count(*) from public.launch_signups where updated_at > now() - interval '1 minute') > 40 then
    raise exception 'Lots of people are signing up right now. Please try again in a minute.';
  end if;

  existed := exists (select 1 from public.launch_signups where contact_key = k);
  insert into public.launch_signups (name, contact, contact_key, kind, consent)
  values (n, c, k, p_kind, true)
  on conflict (contact_key) do update set name = excluded.name, contact = excluded.contact, kind = excluded.kind,
                                          consent = true, updated_at = now();
  return case when existed then 'updated' else 'added' end;
end $$;
revoke all on function public.join_launch_list(text, text, text, boolean) from public;
grant execute on function public.join_launch_list(text, text, text, boolean) to anon, authenticated;

commit;

-- Check (should say 0 the first time):
select count(*) as sign_ups from public.launch_signups;

-- Later, to see the list (newest first):
-- select created_at, name, contact, kind, notified_at from public.launch_signups order by created_at desc;
