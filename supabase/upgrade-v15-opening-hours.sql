-- Servly AG v15: opening hours per listing.
-- Merchants switch "Show opening hours" on or off for each listing and set a weekly timetable.
-- Turning the switch off keeps the hours saved, just hidden from customers.
-- Run this AFTER upgrade-v14-launch-ready.sql (Supabase > SQL Editor). Nothing is changed or deleted.
--
-- hours looks like: {"mon": {"open": true, "from": "09:00", "to": "17:00"}, ..., "sun": {"open": false, ...}}
-- Times are Antigua time. A closing time earlier than the opening time means "after midnight".

alter table public.services add column show_hours boolean not null default false;
alter table public.services add column hours jsonb;
grant update (show_hours, hours) on public.services to authenticated;
