-- Servly AG: opening hours for 6 DEMO businesses, so you can see the hours card and the "Open" badge.
-- Paste into Supabase > SQL Editor > Run. Changes only the demo listings (@demo.servly.test). Safe to run again.
--
-- Each business gets its own weekly hours. Today's hours are stretched to include the time you run
-- this, so all six show "Open" right now. Run it again another day to make them all open again.
-- To hide the hours again: update public.services set show_hours = false
--   where merchant_id in (select id from auth.users where email like '%@demo.servly.test');

do $$
declare
  b record;
  h jsonb;
  today text := to_char(now() at time zone 'America/Antigua', 'dy');                 -- 'mon' ... 'sun'
  nowt time := date_trunc('hour', (now() at time zone 'America/Antigua'))::time;      -- this hour, Antigua time
  t_from time;
  t_to time;
begin
  for b in
    select * from jsonb_to_recordset($json$[
      {"email":"islandfresh@demo.servly.test", "hours":{
        "mon":{"open":true,"from":"08:00","to":"17:00"},"tue":{"open":true,"from":"08:00","to":"17:00"},
        "wed":{"open":true,"from":"08:00","to":"17:00"},"thu":{"open":true,"from":"08:00","to":"17:00"},
        "fri":{"open":true,"from":"08:00","to":"17:00"},"sat":{"open":true,"from":"08:00","to":"12:00"},
        "sun":{"open":false,"from":"09:00","to":"17:00"}}},
      {"email":"jollycuts@demo.servly.test", "hours":{
        "mon":{"open":false,"from":"10:00","to":"20:00"},"tue":{"open":true,"from":"10:00","to":"20:00"},
        "wed":{"open":true,"from":"10:00","to":"20:00"},"thu":{"open":true,"from":"10:00","to":"20:00"},
        "fri":{"open":true,"from":"10:00","to":"21:00"},"sat":{"open":true,"from":"09:00","to":"21:00"},
        "sun":{"open":true,"from":"12:00","to":"18:00"}}},
      {"email":"coralglow@demo.servly.test", "hours":{
        "mon":{"open":true,"from":"09:00","to":"19:00"},"tue":{"open":true,"from":"09:00","to":"19:00"},
        "wed":{"open":true,"from":"09:00","to":"19:00"},"thu":{"open":true,"from":"09:00","to":"19:00"},
        "fri":{"open":true,"from":"09:00","to":"19:00"},"sat":{"open":true,"from":"09:00","to":"16:00"},
        "sun":{"open":false,"from":"09:00","to":"17:00"}}},
      {"email":"turnersbay@demo.servly.test", "hours":{
        "mon":{"open":true,"from":"07:00","to":"15:00"},"tue":{"open":true,"from":"07:00","to":"15:00"},
        "wed":{"open":true,"from":"07:00","to":"15:00"},"thu":{"open":true,"from":"07:00","to":"15:00"},
        "fri":{"open":true,"from":"07:00","to":"15:00"},"sat":{"open":false,"from":"09:00","to":"17:00"},
        "sun":{"open":false,"from":"09:00","to":"17:00"}}},
      {"email":"caribbeancool@demo.servly.test", "hours":{
        "mon":{"open":true,"from":"07:30","to":"16:30"},"tue":{"open":true,"from":"07:30","to":"16:30"},
        "wed":{"open":true,"from":"07:30","to":"16:30"},"thu":{"open":true,"from":"07:30","to":"16:30"},
        "fri":{"open":true,"from":"07:30","to":"16:30"},"sat":{"open":true,"from":"08:00","to":"13:00"},
        "sun":{"open":false,"from":"09:00","to":"17:00"}}},
      {"email":"swiftisland@demo.servly.test", "hours":{
        "mon":{"open":true,"from":"06:00","to":"22:00"},"tue":{"open":true,"from":"06:00","to":"22:00"},
        "wed":{"open":true,"from":"06:00","to":"22:00"},"thu":{"open":true,"from":"06:00","to":"22:00"},
        "fri":{"open":true,"from":"06:00","to":"22:00"},"sat":{"open":true,"from":"06:00","to":"22:00"},
        "sun":{"open":true,"from":"08:00","to":"20:00"}}}
    ]$json$::jsonb) as x(email text, hours jsonb)
  loop
    h := b.hours;
    -- Stretch today so it starts at least 1 hour ago and ends at least 2 hours from now.
    t_from := least((h -> today ->> 'from')::time, case when nowt >= '01:00' then nowt - interval '1 hour' else '00:00' end);
    t_to := nowt + interval '2 hours';
    if t_to > nowt then t_to := greatest((h -> today ->> 'to')::time, t_to); end if;   -- (past midnight: keep the late time)
    h := jsonb_set(h, array[today], jsonb_build_object('open', true, 'from', to_char(t_from, 'HH24:MI'), 'to', to_char(t_to, 'HH24:MI')));

    update public.services set show_hours = true, hours = h
    where merchant_id = (select id from auth.users where email = b.email);
  end loop;
end $$;

-- Check: the six businesses and today's hours.
select p.display_name, s.title, s.hours -> to_char(now() at time zone 'America/Antigua', 'dy') as today
from public.services s join public.profiles p on p.id = s.merchant_id
where s.show_hours and s.merchant_id in (select id from auth.users where email like '%@demo.servly.test')
order by p.display_name;
