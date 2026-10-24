-- Servly AG: 10 DEMO businesses so you can see how the app looks with real-looking merchants.
-- Paste into Supabase > SQL Editor > Run. Safe to run twice (existing demo accounts are skipped).
-- Remove them all later with supabase/demo-accounts-remove.sql.
--
-- Plans: 5 Starter (basic), 3 Growth (plus), 2 Business (premium), each activated with
-- activate_plan (one month, logs a payment so a receipt exists). The names are made up.
-- Demo accounts: emails end in @demo.servly.test (can never be real), they have NO password
-- (nobody can log in to them), and the phone numbers are fake 555 numbers.

do $$
declare
  m record;
  uid uuid;
  s jsonb;
begin
  for m in
    select * from jsonb_to_recordset($json$[
      {"email":"islandfresh@demo.servly.test","name":"Island Fresh Cleaning","tier":"basic","booking":false,
       "bio":"Reliable home and office cleaning across St. John's. Eco-friendly products, fully insured team.","phone":"268-555-0101",
       "services":[{"title":"Home deep cleaning","description":"Kitchen, bathrooms, floors, windows and dusting. Bring-your-own-supplies discount available.","tags":["cleaning","home cleaning","maid","housekeeping"],"price":180,"city":"St. John's","village":"Gray's Farm"}]},
      {"email":"jollycuts@demo.servly.test","name":"Jolly Harbour Barber Lounge","tier":"basic","booking":false,
       "bio":"Fresh fades, beard trims and kids' cuts in a relaxed lounge by the marina.","phone":"268-555-0102",
       "services":[{"title":"Men's haircut and beard trim","description":"Classic or skin fade, hot towel finish and beard line-up.","tags":["barber","haircut","fade","beard"],"price":45,"city":"Jolly Harbour","village":""}]},
      {"email":"sunrisetutoring@demo.servly.test","name":"Sunrise Tutoring","tier":"basic","booking":false,
       "bio":"Patient, qualified tutors for primary and secondary students. CSEC maths and English specialists.","phone":"268-555-0103",
       "services":[{"title":"CSEC maths and English tutoring","description":"One-to-one or small group lessons, after school and Saturdays. Past-paper practice included.","tags":["tutor","tutoring","csec","maths","english","lessons"],"price":60,"city":"All Saints","village":""}]},
      {"email":"wadadliplumbing@demo.servly.test","name":"Wadadli Plumbing & Repairs","tier":"basic","booking":false,
       "bio":"Leaks, blocked drains, water tanks and pump installs. Same-day call-outs where possible.","phone":"268-555-0104",
       "services":[{"title":"Plumbing repairs and installs","description":"Leaking taps and pipes, blocked drains, toilet and water pump repairs, cistern and tank installs.","tags":["plumber","plumbing","leak","drain","water pump"],"price":120,"city":"St. John's","village":"Villa"}]},
      {"email":"libertalawn@demo.servly.test","name":"Liberta Lawn & Garden","tier":"basic","booking":false,
       "bio":"Grass cutting, hedge trimming and yard clean-ups for homes and small businesses.","phone":"268-555-0105",
       "services":[{"title":"Lawn mowing and yard clean-up","description":"Mowing, edging, hedge trimming and green waste removal. Weekly or one-off visits.","tags":["gardener","lawn","yard","landscaping","grass cutting"],"price":90,"city":"Liberta","village":""}]},
      {"email":"coralglow@demo.servly.test","name":"Coral Glow Beauty Studio","tier":"plus","booking":true,
       "bio":"Nails, lashes and brows by certified technicians. Walk-ins welcome, appointments preferred.","phone":"268-555-0106",
       "services":[
         {"title":"Gel manicure and pedicure","description":"Shape, cuticle care and long-lasting gel colour. Nail art available.","tags":["nails","manicure","pedicure","beauty","gel"],"price":120,"city":"St. John's","village":"Redcliffe Quay"},
         {"title":"Lash extensions","description":"Classic, hybrid and volume sets with free 2-week touch-up.","tags":["lashes","lash extensions","beauty","brows"],"price":150,"city":"St. John's","village":"Redcliffe Quay"}]},
      {"email":"turnersbay@demo.servly.test","name":"Turner's Bay Catering","tier":"plus","booking":false,
       "bio":"Local and international menus for weddings, birthdays and office lunches. Island flavours, made fresh.","phone":"268-555-0107",
       "services":[
         {"title":"Event catering","description":"Buffet or plated menus for 20 to 300 guests, including servers and setup.","tags":["catering","caterer","food","events","wedding"],"price":45,"city":"Old Road","village":""},
         {"title":"Office lunch boxes","description":"Daily or weekly lunch boxes delivered to your office. Minimum 10 boxes.","tags":["lunch","catering","food delivery","office"],"price":25,"city":"St. John's","village":""}]},
      {"email":"caribbeancool@demo.servly.test","name":"Caribbean Cool AC Services","tier":"plus","booking":false,
       "bio":"Air conditioning installs, servicing and repairs. Certified technicians, all major brands.","phone":"268-555-0108",
       "services":[
         {"title":"AC servicing and cleaning","description":"Full clean, gas check and filter replacement for split units.","tags":["ac","air conditioning","technician","aircon repair"],"price":150,"city":"St. John's","village":"Cedar Grove"},
         {"title":"New AC installation","description":"Supply and install of inverter split units, including brackets and piping.","tags":["ac","air conditioning","installation","electrician"],"price":650,"city":"St. John's","village":"Cedar Grove"}]},
      {"email":"englishharbourevents@demo.servly.test","name":"English Harbour Event Rentals","tier":"premium","booking":false,
       "bio":"Tents, tables, chairs, linens and decor for weddings, parties and corporate events island-wide.","phone":"268-555-0109",
       "services":[
         {"title":"Tent and furniture rentals","description":"Tents from 10x10 to 40x80, tables, chairs and dance floors. Delivery and setup included.","tags":["tent rental","party rentals","chairs","tables","events"],"price":500,"city":"English Harbour","village":""},
         {"title":"Wedding decor packages","description":"Centrepieces, draping, lighting and arches styled to your colours.","tags":["wedding","decor","events","decoration"],"price":1500,"city":"English Harbour","village":""},
         {"title":"Sound system and DJ hire","description":"PA systems, microphones and an experienced DJ for any size event.","tags":["dj","sound system","music","events","party"],"price":800,"city":"English Harbour","village":""}]},
      {"email":"swiftisland@demo.servly.test","name":"Swift Island Movers","tier":"premium","booking":false,
       "bio":"House moves, office relocations and same-day deliveries with careful, uniformed crews.","phone":"268-555-0110",
       "services":[
         {"title":"Home and office moving","description":"Packing, loading, transport and unpacking. Furniture assembly included.","tags":["movers","moving","relocation","truck"],"price":400,"city":"St. John's","village":"Golden Grove"},
         {"title":"Same-day delivery","description":"Appliances, furniture and parcels delivered anywhere on Antigua the same day.","tags":["delivery","courier","transport","truck"],"price":80,"city":"St. John's","village":"Golden Grove"}]}
    ]$json$::jsonb) as x(email text, name text, tier text, booking boolean, bio text, phone text, services jsonb)
  loop
    if exists (select 1 from auth.users u where u.email = m.email) then continue; end if;
    uid := gen_random_uuid();

    -- The account (no password, so nobody can log in). Creating it also creates its profile.
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', m.email, '', now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', m.name), now(), now(),
            '', '', '', '');

    update public.profiles set bio = m.bio, phone = m.phone where id = uid;

    -- Activate the plan (sets the tier, adds one month, logs a payment / receipt).
    perform public.activate_plan(uid, m.tier, m.booking);

    for s in select * from jsonb_array_elements(m.services) loop
      insert into public.services (merchant_id, title, description, tags, price, city, village)
      values (uid, s->>'title', s->>'description',
              array(select jsonb_array_elements_text(s->'tags')),
              (s->>'price')::numeric, s->>'city', nullif(s->>'village', ''));
    end loop;
  end loop;
end $$;

-- Check: the 10 demo businesses, their plan and number of listings.
select p.display_name, t.name as plan, p.plan_expires_at::date as active_until,
       (select count(*) from public.services s where s.merchant_id = p.id) as listings
from public.profiles p join auth.users u on u.id = p.id join public.tiers t on t.id = p.tier_id
where u.email like '%@demo.servly.test'
order by t.priority_rank desc, p.display_name;
