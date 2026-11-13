# Servly AG: owner's guide

This guide explains what each part of the app does, **which file to open to change it**, and the steps
only you can do. File paths are inside the `servly-app` folder.

> After changing a file, save it. If the app is running (`npx expo start`), it refreshes by itself.
> Before saving to git, run `npm run typecheck` and `npm test` (see "Checking your changes" at the end).

---

## 1. Do these first (after this update)

1. **Run the database updates.** Supabase > SQL Editor > paste `supabase/upgrade-v14-launch-ready.sql` > Run, then `supabase/upgrade-v15-opening-hours.sql` > Run, then `supabase/upgrade-v16-screen-name.sql` > Run, then `supabase/upgrade-v17-max-tags.sql` > Run, then `supabase/upgrade-v18-photo-focus.sql` > Run, then `supabase/upgrade-v19-search-as-you-type.sql` > Run, then `supabase/upgrade-v20-plan-changes.sql` > Run, then `supabase/upgrade-v22-free-trials.sql` > Run (it works with or without the optional v21), then `supabase/upgrade-v23-promo-codes.sql` > Run, then `supabase/upgrade-v24-search-everywhere.sql` > Run, then `supabase/upgrade-v25-smart-search.sql` > Run, then `supabase/upgrade-v26-admin-controls.sql` > Run, then `supabase/upgrade-v27-admins-see-all-listings.sql` > Run, then `supabase/upgrade-v28-free-bookings.sql` > Run, then `supabase/upgrade-v29-call-taps.sql` > Run, then `supabase/upgrade-v30-ranked-search.sql` > Run, then `supabase/upgrade-v31-fair-turns.sql` > Run, then `supabase/upgrade-v32-card-payments.sql` > Run, then `supabase/upgrade-v33-monthly-charges.sql` > Run, then `supabase/upgrade-v34-notification-sounds.sql` > Run, then `supabase/upgrade-v35-delete-listing.sql` > Run, then `supabase/upgrade-v36-anonymous-reviews.sql` > Run (reviews stay, shown as "Customer", when their writer deletes their account).
   **Search: never run v19, v21, v24, v25 or v30 again after v31** (each search update replaces the last one; v31 is the current search).
   *Do not run* `supabase/upgrade-v21-search-word-starts.sql` again: it made search match only the start of words, and v24/v25 replace it. To check which updates are installed, run `npm run check:db`.
   Supabase warns about "destructive operations": those lines replace old rules with stricter ones
   (blocking) and keep payment records when an account is deleted. No data is removed.
2. **Make yourself an admin** (SQL Editor, change the email):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'YOUR-EMAIL';
   ```
   An **Admin** item then appears in your ☰ menu.
3. **Start the app** again (`npx expo start`). It refreshes its list of screens (for the new Admin,
   Privacy and Terms pages).

---

## 2. Where everything lives

| Feature | What it does | Change it in |
|---|---|---|
| **Admin dashboard** (☰ > Admin) | Activate/renew plans, start free trials, free bookings, switch the booking app, answer support, handle reports | `src/app/admin.tsx`; who is an admin: the `admins` table (SQL above) |
| **Delete my account** (Account, bottom) | Deletes the account and everything attached; keeps payment records without the name | Screen: `src/app/account.tsx` (`deleteAccount`); database: `delete_my_account()` in v14 |
| **Privacy Policy / Terms / Refund and Cancellation Policy** | Draft legal pages (`/privacy`, `/terms`, `/refunds`), linked from sign-up, Account and Home. The Refund Policy link shows on the website for everyone, but in the phone apps only to merchants (Account in merchant view, Plan screen, Checkout next to Pay), since customers never pay Servly. Refund rules: no refund once a month starts, cancel via Contact support, billing mistakes refunded if reported within 30 days | **Wording:** `src/lib/legal.ts` (`PRIVACY`, `TERMS`, `REFUNDS`: headings and paragraphs). Date: `LEGAL_UPDATED`. Have a lawyer review before launch. |
| **Reports** (listings, reviews, people) | Anyone logged in can report; you see them in Admin > Reports | Reasons list: `REASONS` in `src/components/ReportButton.tsx` (also allowed reasons in the `reports` table, v14) |
| **Blocking** (in a chat) | Blocked people can't message, start a chat, or book you | Chat screen: `src/app/chat/[id].tsx`; rules: v14 section 3 |
| **Review replies** | Merchants reply publicly to reviews of their listings | `ReviewItem` in `src/components/Reviews.tsx` |
| **Moving to a smaller plan** (paused listings) | Choosing a plan with fewer listings asks which listings to keep. A move down waits until the paid month ends; an hourly job then switches the plan, pauses the other listings (hidden, kept), sets the booking app and notifies the merchant. Merchants can't swap paused and live listings; after an upgrade, each free slot lets them **Bring back** one (Account) | Keep window: `src/components/KeepListings.tsx` (used in `src/app/plan.tsx`). Paused listings + Bring back: `src/app/account.tsx`. Rules: `activate_plan`, `apply_plan_change`, `choose_listings_to_keep`, `restore_listing`, `apply_due_plan_changes` (job `servly-plan-changes`, hourly) in `supabase/upgrade-v20-plan-changes.sql`. To un-pause a listing by hand: Table Editor > services > `paused` |
| **Promo codes** (launch) | LAUNCH50 and LAUNCH50B: 50% off the plan price (not the booking add-on) for the first 2 payments, 25 merchants each. Merchants type the code at Checkout; it holds a place for 7 days. One code per merchant, never with a free trial. Both codes start switched off | Checkout box: `src/app/checkout.tsx`. Sums: `src/lib/promo.ts`. Admin > Promos: `Promos` in `src/app/admin.tsx`. Database: `supabase/upgrade-v23-promo-codes.sql` (`promo_codes`, `promo_redemptions`, `apply_promo_code`, `next_promo_discount`, `activate_plan`). New code: Supabase > Table Editor > `promo_codes` > Insert row (code in CAPITALS) |
| **Free trials** (Founding Merchants) | Admin gives a merchant a plan free until a date you pick (default 8 March 2027, 60 days after launch). No payment and no receipt; one trial per merchant, only when they have no active plan. Works like a paid plan; a move to a smaller plan waits until it ends; paying during the trial adds the month after it. The merchant sees "free trial until <date>"; if it ends unpaid, listings hide like any ended plan | Button: `MerchantCard` in `src/app/admin.tsx`. Text: `src/lib/trial.ts`. Rules: `start_free_trial()` in `supabase/upgrade-v22-free-trials.sql`. Record of every trial: Table Editor > `free_trials` |
| **Plan ending warning** | Gold banner 5 days before a plan ends; red once it has ended | Days: `WARN_DAYS` in `src/components/PlanBanner.tsx`; wording in the same file |
| **Plan ending notification** | Phone notification about 3 days before (9:00 AM Antigua) | `plan_expiry_reminders()` and its schedule in v14 section 7 |
| **First-time guide** (phones: the apps, and the website on a phone; not on computers) | The first time someone opens the app, Home dims and points at each part in turn (search, area, Run a business?, listings, menu / Log in) with a short card. Then, the first time they open a listing or any other page, a one-time tip lights up the small Servly logo at the top: "tap it to go straight back to Home". Replaying the guide shows that tip again too. Next, Back, Skip; shown once per phone. Anyone can replay it: **How to use Servly** at the bottom of the ☰ menu, or (for guests) the link at the bottom of Home | Wording and order: `guideSteps` in `src/app/index.tsx`. Look: `src/components/FirstTimeGuide.tsx`. To see it again on a test phone: delete and reinstall the app (or clear Expo Go's data) |
| **Merchant welcome tour** (phones only) | The first time someone opens Account in Merchant view (publishing a first listing takes them there), the screen dims and lights up 4 parts in turn: **Welcome to Servly** (their plan and when it renews), **Your receipts**, **Your listings** (View and Edit), and **Messages and help** (the ☰ menu). Shown once per phone; it waits for the logo tip to close first. In Merchant view, **How to use Servly** in the ☰ menu replays this tour (in Customer view it replays the Home guide). No database change | Wording: `tourSteps` in `src/app/account.tsx` |
| **Search** | **Plan first, everyone takes turns (v31):** matching listings show Business plan first, then Growth, then Starter; inside each plan the order rotates every 30 minutes, so every business gets turns at the front (everyone sees the same order during a half hour). Typing most of a business's name shows only that business. While typing, a list under the box suggests up to 3 businesses (tap to open: one whose name was typed first, then 2 spots for the highest plan that matches and 1 spot that all other plans share in turn) and services (tap to search). (v30 put the best word match first; v31 keeps v30's matching rules and changes only the order.) Updates as you type (from 2 letters; deleting letters widens the results). Listing name, description, hidden tags and the business name (v24); words of 4+ letters match inside words ("clean" finds "housecleaning") while 2-3 letter words match only word starts ("ac" finds AC servicing, not "packing") (v25); related word forms match ("cleaner" finds "cleaning", "plumber" finds "plumbing"); several words show listings with all of them, or any of them if none has all; forgives small spelling mistakes; 30 results at a time. Results show in two swipe rows: Popular picks (the highest-paying plan in the results: Business, or Growth if there are no Business listings, or Starter), then More local services (the rest, highest-paying first), with no tier names and never an empty row | How often the order turns: 30 in `search_turn_minutes()` (v31; change it and run just that function in the SQL Editor). Wait after typing: `LIVE_WAIT` in `src/app/index.tsx`. Matching: `search_services()`, `search_word_found()` and `search_norm()` in v25, `search_stem()` in v24. Layout: `splitRows` in `src/lib/rows.ts` + `ListingRow`. Results per page: `PAGE` in `src/app/index.tsx`. How forgiving: the `0.45` / `0.4` numbers in `search_services()` (v14 section 6; lower = more forgiving) |
| **Photo framing + full-screen photos** | Merchants tap a photo on Offer/Edit and drag it to choose which part shows on cards (the whole photo is kept). Customers tap any photo on a listing to see it whole, swipe between photos, × to close | Framing window: `src/components/PhotoFramer.tsx`. Viewer: `src/components/PhotoViewer.tsx`. Focus helpers: `src/lib/focus.ts`. Database: `services.photo_focus` (`supabase/upgrade-v18-photo-focus.sql`) |
| **Smaller photos** | Photos shrink to max 1600 px wide, JPEG quality 0.7 before upload | `MAX_WIDTH` and `QUALITY` in `src/lib/photos.ts` |
| **Opening hours** (per listing) | "Show opening hours" switch + weekly table on Offer/Edit; "Open now / Closed now" card on the listing (Antigua time) | Starting week: `DEFAULT_HOURS` in `src/lib/hours.ts`. Editor: `src/components/HoursEditor.tsx`. Card: `src/components/HoursCard.tsx`. Small "Open" on Home cards (only while open): `ListingCard` in `src/components/ListingRow.tsx`. Database: `supabase/upgrade-v15-opening-hours.sql`. Demo hours: `supabase/demo-opening-hours.sql` |
| **Name (screen name)** | The "Name" asked at sign-up; shown on reviews and messages sent in Customer view. In Merchant view the business name is shown instead. Each chat/review remembers which | Sign-up: `src/app/login.tsx`. Account: Name + Business name boxes in `src/app/account.tsx`. Which name to show: `customerName` in `src/lib/names.ts`. Database: `supabase/upgrade-v16-screen-name.sql` |
| **Business profile link** | Tapping the business name on a listing opens their profile | `Listing` in `src/app/service/[id].tsx` |
| **Push notifications** | New messages, booking cards, booking reminders, plan ending | App side: `src/lib/push.ts`. What triggers them and their wording: `push_new_message()` and `plan_expiry_reminders()` in v14 section 7 |
| **Automatic monthly payments (v33)** | Each morning (6 AM) Servly charges the saved card of merchants whose plan ends that day; a failed charge is tried for 3 more days (listings stay visible), then the listings hide. Merchants switch it off on Account ("Pay automatically each month"). Problems: Supabase > Table Editor > `renewal_charges` (status failed/stopped, or stuck on "charging") | `supabase/functions/payment-renewals`; `src/components/AutoPay.tsx`; steps in `docs/CYBERSOURCE-SETUP.md` |
| **Card payments (ACB / CyberSource, v32)** | Pay on Checkout opens the secure card page; a paid order switches the plan on and makes the receipt | `supabase/functions/payment-start`, `payment-return`, `payment-webhook`; `src/app/pay.tsx`, `payment-result.tsx`; steps in `docs/CYBERSOURCE-SETUP.md` |
| **Automated tests** | Check prices, Antigua time, bookings, unread messages, the price box | `__tests__/` folder; run `npm test` |
| **Migrations** | All database changes, numbered in order, for the Supabase tool | `supabase/migrations/` |
| **Phone builds** | Settings for test and store builds | `eas.json` |

Everything from earlier (bookings, reviews, receipts, support, prices, tiers, colours) is described in
`CLAUDE.md` and `README.md`. Colours and shared styles: `src/lib/theme.ts`. Receipt seller details:
`SELLER` in `src/lib/receipt.ts`. Booking times and reminder times: `src/components/DateTimePicker.tsx`
(`SLOTS`) and `send_booking_reminders()` in `supabase/upgrade-v13-bookings.sql`.

---

## 3. Daily admin tasks (in the app: ☰ > Admin)

- **A merchant paid:** Merchants tab > search their name or email > pick the plan (+ booking app if they
  paid for it) > **Activate 1 month** (or **Renew**). This adds one month and creates their receipt.
- **Launch promo codes:** Promos tab > **Switch on** LAUNCH50 on launch day. Each card shows "n of 25 used · n waiting
  for payment · n left". When it runs out, **Switch on** LAUNCH50B. When you activate a merchant who used a code,
  their card says "Promo LAUNCH50: next payment 50% off the plan (1 of 2)" and Activate charges half the plan price.
- **Give a Founding Merchant a free trial:** Merchants tab > search them > pick the plan (+ booking app
  if you want it included) > check **Free trial ends on** (8 March 2027 is filled in: 60 days after the
  7 January launch; tap **Change** to pick another day) > **Start free trial until ...**. Servly works out the
  days. Their listings show from now until that date, so founding listings are ready for launch day. No receipt is
  made. The button only shows for merchants who never had a trial and have no active plan.
- **Free bookings** (no charge; v28): Merchants tab > search them > type the days (30 is filled in) > **Bookings on
  (no charge)**. They switch off by themselves when the days run out; tap again to add more days, or **Off** to end
  them now. The card says why a merchant has bookings: included with Business, paid upgrade, free trial, or free
  until a date. Business plans always include bookings, so there is no switch for them. The **Renew / Activate 1
  month (paid)** button records a payment and a receipt; tick **+ booking app** first if they paid for bookings too.
- **Change a plan without charging** (no payment, no receipt; v26): Merchants tab > search them > pick Starter /
  Growth / Business (+ booking app) > **Change plan to … now (no charge)**. It happens straight away and keeps their
  end date. Moving down pauses listings over the new limit (their oldest are kept) and says how many.
- **Give extra time / bring back an expired merchant** (no charge; v26): type the number of days (30 is filled in) >
  **Extend plan (no charge)**. Days are added from today if the plan has ended, otherwise from its end date.
- **Turn one listing off or on** (v26): on their card > **Show listings** > **Turn off** / **Turn on**. Each shows Live,
  Off, Paused (plan limit) or Hidden: plan ended. Turning on also brings back a paused listing, even over the
  plan's limit (your choice). A listing still only shows while the merchant's plan has time left. Tap a listing's name to open it, even when
  it is off (v27): a red banner says why customers can't see it.
- **Call taps** (v29, only you see them for now): each merchant card shows "📞 n call taps this month · n overall", and
  Show listings shows the same per listing. A tap is counted when anyone (guests too) taps Call on a listing or the
  business profile. Servly can't see whether the call connected. To show merchants their numbers later, ask for it
  in an app update: the history is already being kept.
- **Answer support:** Support tab > type your reply > **Send reply and resolve**. They see it instantly.
- **Handle a report:** Reports tab > **Open** to look > **Hide listing** if needed > add a note >
  **Mark resolved**. To delete an account or review completely, use Supabase > Table Editor.

---

## 4. Push notifications (phones)

They are sent by the database through Expo's free push service. To switch them on:

1. Create a free account at expo.dev, then in the `servly-app` folder:
   ```bash
   npx eas-cli login
   npx eas-cli init
   ```
   `init` adds your project id to `app.json`; the app needs it to get a notification address.
2. Notifications work in a **real build** (step 5 below). Expo Go on **iPhone** also works; Expo Go on
   **Android** does not support push (that's an Expo limitation), so use the test build there.
3. The first time someone logs in on a phone, the app asks permission. Each phone is saved in the
   `push_tokens` table.

---

## 5. Test build on your phone (EAS)

1. Give the build your Supabase keys (they are not uploaded from `.env`). Use the values from your `.env`:
   ```bash
   npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "YOUR-URL" --visibility plaintext
   npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR-ANON-KEY" --visibility plaintext
   ```
   (Repeat with `--environment production` before a store build. Only ever the **anon** key.)
2. Build an Android test app (an .apk you install directly):
   ```bash
   npx eas-cli build --platform android --profile preview
   ```
   When it finishes, open the link on your Android phone to install it.
3. Store builds later: `npx eas-cli build --platform android --profile production` (and `ios`).

---

## 5b. Over-the-air updates (EAS Update, set up 2026-11-12)

Changes to screens, wording and app logic can reach phones without a new store review. The app downloads
the update quietly and uses it the next time it is opened.

- Test phones (the preview APK):
  ```bash
  npx eas-cli update --channel preview --environment preview --message "What changed"
  ```
- Store apps (after launch): the same with `--channel production --environment production`.
- What can NOT go over the air: new permissions, notification sounds, app icon, new native packages. Those need
  a new build; EAS knows by itself (runtime version "fingerprint"), so an update never reaches an app it doesn't fit.
- Store rules: fine for fixes and improvements; bigger new features (Jobs board, promotions) go through a
  normal reviewed update.
- Only builds made AFTER 2026-11-12 can receive updates (the first one with expo-updates inside).

---

## 6. Payments (ACB, using CyberSource)

Built 2026-11-07 (database v32). The full switch-on steps, the secret names and the test card are in
`docs/CYBERSOURCE-SETUP.md` ("Owner: switching it on for testing"). In short: run v32, add the CyberSource
secrets in Supabase > Edge Functions > Secrets, put the functions online with `npx supabase functions deploy`,
set `EXPO_PUBLIC_PAY_URL` in `.env`, then pay with a test card.

How it works: Checkout > Pay > Servly works out the price > ACB's secure card page (Servly never sees the
card number) > back to Servly > the plan switches on for a month and the receipt appears. If a merchant
closes the page early, CyberSource still tells Servly. Not built yet: the automatic monthly charge.
Remember the app-store rules: Apple and Google generally require their own billing for things bought
inside an app; taking payment on a website is the usual approach. Check the current rules before publishing.

---

## 7. Database migrations (the Supabase tool)

All database changes are in `supabase/migrations/`, numbered in the order they run. With the
Supabase tool (`npx supabase ...`) you can set up a brand-new project in one step:
```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase db push
```
**Your current project already has all of these** (you ran them in the SQL Editor). Tell the tool so
it doesn't run them twice:
```bash
npx supabase migration repair --status applied 20261024000001 20261024000002 20261024000003 20261024000004 20261024000005 20261024000006 20261024000007 20261024000008 20261024000009 20261024000010 20261024000011 20261024000012 20261026000013 20261026000014 20261028000015 20261029000016 20261029000017 20261029000018 20261031000020 20261101000021 20261102000022 20261102000023 20261102000024
```
For future database changes, add a new numbered file to `supabase/migrations/` and run `npx supabase db push`.
(The `upgrade-v*.sql` files stay for pasting into the SQL Editor, as before.)

---

## 8. Things only you can decide or set up

- **Email provider** (password resets for customers, email confirmation): Supabase > Authentication >
  Emails > SMTP Settings. Then switch **Confirm email** back on.
- **Supabase plan:** free projects **pause after about a week with no activity**; the app then shows
  "Something went wrong" until you restore it in the Supabase dashboard. A paid plan doesn't pause.
- **Lawyer review** of the Privacy Policy and Terms (`src/lib/legal.ts`).
- **Payment provider** (section 6).

---

## 9. Checking your changes

```bash
npm run typecheck
npm test
npx expo-doctor
```
`typecheck` finds mistakes in the code, `test` runs the automated checks in `__tests__/`, and
`expo-doctor` checks the Expo setup. All three should pass before you save to git.
