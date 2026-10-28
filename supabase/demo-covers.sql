-- Servly AG: cover pictures for the 16 DEMO listings (designed covers, not photos).
-- Version 4: big centre icon with a halo (soft glow + dashed ring), flag ribbon along the bottom.
-- 1. Upload first: Supabase > Storage > service-photos > open the "demo" folder > drag in all 16 pictures
--    from servly-app/supabase/demo-covers-v4 (names end in -v4.jpg).
-- 2. Then paste this into Supabase > SQL Editor > Run. Safe to run twice.
-- Each demo listing gets its picture as photo 1 (the cover); any older demo cover is removed from the
-- listing, and the merchant's other photos are kept.
-- Undo: update public.services set photos = array_remove(photos, photos[1]) where photos[1] like 'demo/%';

update public.services s
set photos = array[x.path] || array(select p from unnest(coalesce(s.photos, '{}')) p where p not like 'demo/%')
from (values
  ('islandfresh@demo.servly.test', 'Home deep cleaning', 'demo/home-deep-cleaning-v4.jpg'),
  ('jollycuts@demo.servly.test', 'Men''s haircut and beard trim', 'demo/men-s-haircut-and-beard-trim-v4.jpg'),
  ('sunrisetutoring@demo.servly.test', 'CSEC maths and English tutoring', 'demo/csec-maths-and-english-tutoring-v4.jpg'),
  ('wadadliplumbing@demo.servly.test', 'Plumbing repairs and installs', 'demo/plumbing-repairs-and-installs-v4.jpg'),
  ('libertalawn@demo.servly.test', 'Lawn mowing and yard clean-up', 'demo/lawn-mowing-and-yard-clean-up-v4.jpg'),
  ('coralglow@demo.servly.test', 'Gel manicure and pedicure', 'demo/gel-manicure-and-pedicure-v4.jpg'),
  ('coralglow@demo.servly.test', 'Lash extensions', 'demo/lash-extensions-v4.jpg'),
  ('turnersbay@demo.servly.test', 'Event catering', 'demo/event-catering-v4.jpg'),
  ('turnersbay@demo.servly.test', 'Office lunch boxes', 'demo/office-lunch-boxes-v4.jpg'),
  ('caribbeancool@demo.servly.test', 'AC servicing and cleaning', 'demo/ac-servicing-and-cleaning-v4.jpg'),
  ('caribbeancool@demo.servly.test', 'New AC installation', 'demo/new-ac-installation-v4.jpg'),
  ('englishharbourevents@demo.servly.test', 'Tent and furniture rentals', 'demo/tent-and-furniture-rentals-v4.jpg'),
  ('englishharbourevents@demo.servly.test', 'Wedding decor packages', 'demo/wedding-decor-packages-v4.jpg'),
  ('englishharbourevents@demo.servly.test', 'Sound system and DJ hire', 'demo/sound-system-and-dj-hire-v4.jpg'),
  ('swiftisland@demo.servly.test', 'Home and office moving', 'demo/home-and-office-moving-v4.jpg'),
  ('swiftisland@demo.servly.test', 'Same-day delivery', 'demo/same-day-delivery-v4.jpg')
) as x(email, title, path)
join auth.users u on u.email = x.email
where s.merchant_id = u.id and s.title = x.title;

-- Check: every demo listing and its cover (16 rows).
select s.title, s.photos[1] as cover from public.services s
where s.photos[1] like 'demo/%' order by s.title;
