-- Servly AG v18: photo focus points.
-- Merchants drag each photo to choose which part shows on cards (Home, listing page, Account).
-- The whole photo is kept, so customers can still open it full screen.
-- photo_focus maps a photo's path to its focus spot, from 0 (left/top) to 1 (right/bottom), e.g.
--   {"abc/123/0.jpg": {"x": 0.5, "y": 0.3}}
-- Photos without an entry show their centre, as before.
-- Paste into Supabase > SQL Editor > Run (after v17). No data is removed.

alter table public.services add column photo_focus jsonb not null default '{}'::jsonb;
alter table public.services add constraint services_photo_focus_object check (jsonb_typeof(photo_focus) = 'object');

-- Merchants may change it (like photos); the existing row rules still limit them to their own listings.
grant update (photo_focus) on public.services to authenticated;

-- Check: should show photo_focus | jsonb
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'services' and column_name = 'photo_focus';
