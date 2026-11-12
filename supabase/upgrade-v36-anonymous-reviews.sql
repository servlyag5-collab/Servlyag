-- Servly AG v36: reviews stay when the person who wrote them deletes their account (owner's choice, 2026-11-12).
--
--   * Before: deleting an account also deleted every review that person wrote on other businesses' listings.
--   * Now: those reviews stay, with the stars and words unchanged, but no longer linked to anyone
--     (customer_id becomes empty). The app shows the name as "Customer" (owner's choice).
--   * Unchanged: when a business deletes its account, its own listings and the reviews about them go with it.
--   * Nobody can edit an anonymous review any more (the edit rule needs customer_id = the logged-in user).
--
-- Only one link changes: no new tables, no data removed. Paste into Supabase > SQL Editor > Run (after v35).

-- Claim both tables first (waiting up to 10 seconds for the app to finish), so the change can't get stuck
-- halfway against someone reading reviews ("deadlock detected"). If it says "lock timeout", just Run again.
begin;
set local lock_timeout = '10s';
lock table public.reviews, public.profiles in access exclusive mode;

alter table public.reviews alter column customer_id drop not null;

-- Replace the link from a review to its writer: "delete the review with the account" becomes "keep the
-- review, forget the writer". (Found by column, whatever the link is called.)
do $$
declare c record;
begin
  for c in
    select con.conname from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
    where con.conrelid = 'public.reviews'::regclass and con.contype = 'f' and a.attname = 'customer_id'
  loop
    execute format('alter table public.reviews drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.reviews add constraint reviews_customer_id_fkey
  foreign key (customer_id) references public.profiles(id) on delete set null;

commit;

-- Check: should say "SET NULL".
select conname, case confdeltype when 'n' then 'SET NULL' when 'c' then 'CASCADE' else confdeltype::text end as when_account_deleted
from pg_constraint where conrelid = 'public.reviews'::regclass and contype = 'f'
  and conkey = array[(select attnum from pg_attribute where attrelid = 'public.reviews'::regclass and attname = 'customer_id')];
