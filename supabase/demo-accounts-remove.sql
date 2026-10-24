-- Servly AG: remove ALL demo businesses created by demo-accounts.sql.
-- Paste into Supabase > SQL Editor > Run. Only accounts whose email ends in @demo.servly.test are touched.
-- Deleting the account also deletes its profile, listings, payments, conversations, messages and reviews.

delete from auth.users where email like '%@demo.servly.test';

-- Check: should show 0.
select count(*) as demo_accounts_left from auth.users where email like '%@demo.servly.test';
