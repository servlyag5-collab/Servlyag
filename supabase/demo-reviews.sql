-- Servly AG: demo REVIEWS on 4 demo listings (5 or 6 each), so you can see the scrolling review box and
-- "Read more". The reviewers are the OTHER demo businesses (a business never reviews itself).
-- Paste into Supabase > SQL Editor > Run (after demo-accounts.sql). Safe to run twice (no duplicates).
-- Two listings have long reviews (Read more), and some reviews have a reply from the business.
-- Remove only these reviews:
--   delete from public.reviews where customer_id in (select id from auth.users where email like '%@demo.servly.test');
-- (demo-accounts-remove.sql also removes them, with the demo accounts.)

insert into public.reviews (service_id, customer_id, rating, comment, reply, replied_at, created_at, updated_at)
select s.id, c.id, x.rating, x.comment, nullif(x.reply, ''),
       case when x.reply <> '' then now() - make_interval(days => x.days_ago - 1) end,
       now() - make_interval(days => x.days_ago), now() - make_interval(days => x.days_ago)
from jsonb_to_recordset($json$[
  {"owner":"turnersbay@demo.servly.test","listing":"Office lunch boxes","by":"islandfresh@demo.servly.test","rating":5,"days_ago":3,
   "comment":"We order these for our whole cleaning crew every Friday. Food is always hot and on time.","reply":""},
  {"owner":"turnersbay@demo.servly.test","listing":"Office lunch boxes","by":"caribbeancool@demo.servly.test","rating":4,"days_ago":9,
   "comment":"We switched our office lunches to Turner's Bay about two months ago and honestly it has been one of the best decisions we made this year. The portions are generous, the menu changes every week so nobody gets bored, and there is always a proper vegetarian option. The pepperpot and fungee on Saturdays is a team favourite. Only small thing: delivery once came 20 minutes late during carnival week, but they called ahead to warn us, which we appreciated.",
   "reply":"Thank you so much! Sorry again about carnival week, the roads were blocked. See you Friday."},
  {"owner":"turnersbay@demo.servly.test","listing":"Office lunch boxes","by":"wadadliplumbing@demo.servly.test","rating":5,"days_ago":15,
   "comment":"Tasty, filling and good value. The saltfish and bakes are the best I've had outside my grandmother's kitchen.","reply":""},
  {"owner":"turnersbay@demo.servly.test","listing":"Office lunch boxes","by":"jollycuts@demo.servly.test","rating":3,"days_ago":24,
   "comment":"Good food but the minimum of 10 boxes is a lot for a small shop like ours.","reply":"Thanks for the feedback. We now do 6-box orders on Wednesdays!"},
  {"owner":"turnersbay@demo.servly.test","listing":"Office lunch boxes","by":"libertalawn@demo.servly.test","rating":5,"days_ago":40,
   "comment":"Ordered for a staff meeting. Everyone asked who made the food. Will order again.","reply":""},

  {"owner":"coralglow@demo.servly.test","listing":"Gel manicure and pedicure","by":"sunrisetutoring@demo.servly.test","rating":5,"days_ago":2,
   "comment":"My nails lasted three full weeks without a single chip. Lovely, relaxing studio.","reply":"Thank you! See you next time."},
  {"owner":"coralglow@demo.servly.test","listing":"Gel manicure and pedicure","by":"islandfresh@demo.servly.test","rating":5,"days_ago":6,
   "comment":"I came in before my sister's wedding with nails that were in really bad shape from work, and I was nervous it would take forever. The technician was so patient: she cleaned up my cuticles, shaped everything and helped me pick a soft pink that matched the bridesmaid dresses perfectly. She even added tiny gold accents for the big day. I got so many compliments at the reception and they still looked perfect when I got back to work the following week. Booking again for sure.",
   "reply":""},
  {"owner":"coralglow@demo.servly.test","listing":"Gel manicure and pedicure","by":"englishharbourevents@demo.servly.test","rating":4,"days_ago":12,
   "comment":"Great work and fair price. Had to wait about 15 minutes past my appointment time.","reply":""},
  {"owner":"coralglow@demo.servly.test","listing":"Gel manicure and pedicure","by":"turnersbay@demo.servly.test","rating":5,"days_ago":20,
   "comment":"Best pedicure on the island. The foot massage alone is worth it.","reply":""},
  {"owner":"coralglow@demo.servly.test","listing":"Gel manicure and pedicure","by":"swiftisland@demo.servly.test","rating":4,"days_ago":33,
   "comment":"Bought a gift voucher for my wife. She loved it and is already planning her next visit.","reply":""},
  {"owner":"coralglow@demo.servly.test","listing":"Gel manicure and pedicure","by":"libertalawn@demo.servly.test","rating":5,"days_ago":47,
   "comment":"Clean, friendly and very professional.","reply":""},

  {"owner":"swiftisland@demo.servly.test","listing":"Home and office moving","by":"coralglow@demo.servly.test","rating":5,"days_ago":4,
   "comment":"Moved our whole studio in one morning. Not a single scratch on the chairs.","reply":"Glad we could help, and good luck in the new space!"},
  {"owner":"swiftisland@demo.servly.test","listing":"Home and office moving","by":"sunrisetutoring@demo.servly.test","rating":4,"days_ago":11,
   "comment":"Careful crew, fair price. They were an hour late but called to let us know.","reply":""},
  {"owner":"swiftisland@demo.servly.test","listing":"Home and office moving","by":"turnersbay@demo.servly.test","rating":5,"days_ago":18,
   "comment":"They moved our kitchen equipment including two big fridges. Very professional.","reply":""},
  {"owner":"swiftisland@demo.servly.test","listing":"Home and office moving","by":"jollycuts@demo.servly.test","rating":5,"days_ago":29,
   "comment":"Quick, polite and they put all the furniture back together.","reply":""},
  {"owner":"swiftisland@demo.servly.test","listing":"Home and office moving","by":"wadadliplumbing@demo.servly.test","rating":4,"days_ago":52,
   "comment":"Good service. Would be nice to have boxes for sale.","reply":"Thanks! We now sell moving boxes, just ask when booking."},

  {"owner":"jollycuts@demo.servly.test","listing":"Men's haircut and beard trim","by":"swiftisland@demo.servly.test","rating":5,"days_ago":1,
   "comment":"Cleanest fade I've had in years. Hot towel finish is a nice touch.","reply":""},
  {"owner":"jollycuts@demo.servly.test","listing":"Men's haircut and beard trim","by":"caribbeancool@demo.servly.test","rating":5,"days_ago":8,
   "comment":"Been going here every two weeks since they opened. Always good vibes and good music.","reply":"Appreciate you, boss!"},
  {"owner":"jollycuts@demo.servly.test","listing":"Men's haircut and beard trim","by":"englishharbourevents@demo.servly.test","rating":4,"days_ago":14,
   "comment":"Solid cut. It gets busy on Saturdays so come early.","reply":""},
  {"owner":"jollycuts@demo.servly.test","listing":"Men's haircut and beard trim","by":"wadadliplumbing@demo.servly.test","rating":5,"days_ago":26,
   "comment":"Took my son for his first proper haircut. They were so patient with him.","reply":""},
  {"owner":"jollycuts@demo.servly.test","listing":"Men's haircut and beard trim","by":"libertalawn@demo.servly.test","rating":3,"days_ago":44,
   "comment":"Good barber but parking near the marina is hard.","reply":""}
]$json$::jsonb) as x(owner text, listing text, "by" text, rating int, days_ago int, comment text, reply text)
join auth.users o on o.email = x.owner
join public.services s on s.merchant_id = o.id and s.title = x.listing
join auth.users c on c.email = x."by"
on conflict (service_id, customer_id) do nothing;

-- Check: the four listings and how many reviews each has now.
select s.title, count(r.id) as reviews, round(avg(r.rating), 1) as average
from public.services s join public.reviews r on r.service_id = s.id
where s.title in ('Office lunch boxes', 'Gel manicure and pedicure', 'Home and office moving', 'Men''s haircut and beard trim')
group by s.title order by s.title;
