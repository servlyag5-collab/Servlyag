# Servly AG: owner's guide

This guide explains what each part of the app does, **which file to open to change it**, and the steps
only you can do. File paths are inside the `servly-app` folder.

> After changing a file, save it. If the app is running (`npx expo start`), it refreshes by itself.
> Before saving to git, run `npm run typecheck` and `npm test` (see "Checking your changes" at the end).

---

## 1. Do these first (after this update)

1. **Run the database updates.** Supabase > SQL Editor > paste `supabase/upgrade-v14-launch-ready.sql` > Run, then `supabase/upgrade-v15-opening-hours.sql` > Run, then `supabase/upgrade-v16-screen-name.sql` > Run.
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
| **Admin dashboard** (☰ > Admin) | Activate/renew plans, switch the booking app, answer support, handle reports | `src/app/admin.tsx`; who is an admin: the `admins` table (SQL above) |
| **Delete my account** (Account, bottom) | Deletes the account and everything attached; keeps payment records without the name | Screen: `src/app/account.tsx` (`deleteAccount`); database: `delete_my_account()` in v14 |
| **Privacy Policy / Terms / Refund and Cancellation Policy** | Draft legal pages (`/privacy`, `/terms`, `/refunds`), linked from sign-up, Account and Home; Checkout links the refund policy next to Pay. Refund rules: no refund once a month starts, cancel via Contact support, billing mistakes refunded if reported within 30 days | **Wording:** `src/lib/legal.ts` (`PRIVACY`, `TERMS`, `REFUNDS`: headings and paragraphs). Date: `LEGAL_UPDATED`. Have a lawyer review before launch. |
| **Reports** (listings, reviews, people) | Anyone logged in can report; you see them in Admin > Reports | Reasons list: `REASONS` in `src/components/ReportButton.tsx` (also allowed reasons in the `reports` table, v14) |
| **Blocking** (in a chat) | Blocked people can't message, start a chat, or book you | Chat screen: `src/app/chat/[id].tsx`; rules: v14 section 3 |
| **Review replies** | Merchants reply publicly to reviews of their listings | `ReviewItem` in `src/components/Reviews.tsx` |
| **Plan ending warning** | Gold banner 5 days before a plan ends; red once it has ended | Days: `WARN_DAYS` in `src/components/PlanBanner.tsx`; wording in the same file |
| **Plan ending notification** | Phone notification about 3 days before (9:00 AM Antigua) | `plan_expiry_reminders()` and its schedule in v14 section 7 |
| **Search** | Name, description and hidden tags; forgives small spelling mistakes; 30 results at a time | Results per page: `PAGE` in `src/app/index.tsx`. How forgiving: the `0.45` / `0.4` numbers in `search_services()` (v14 section 6; lower = more forgiving) |
| **Smaller photos** | Photos shrink to max 1600 px wide, JPEG quality 0.7 before upload | `MAX_WIDTH` and `QUALITY` in `src/lib/photos.ts` |
| **Opening hours** (per listing) | "Show opening hours" switch + weekly table on Offer/Edit; "Open now / Closed now" card on the listing (Antigua time) | Starting week: `DEFAULT_HOURS` in `src/lib/hours.ts`. Editor: `src/components/HoursEditor.tsx`. Card: `src/components/HoursCard.tsx`. Small "Open" on Home cards (only while open): `ListingCard` in `src/components/ListingRow.tsx`. Database: `supabase/upgrade-v15-opening-hours.sql`. Demo hours: `supabase/demo-opening-hours.sql` |
| **Name (screen name)** | The "Name" asked at sign-up; shown on reviews and messages sent in Customer view. In Merchant view the business name is shown instead. Each chat/review remembers which | Sign-up: `src/app/login.tsx`. Account: Name + Business name boxes in `src/app/account.tsx`. Which name to show: `customerName` in `src/lib/names.ts`. Database: `supabase/upgrade-v16-screen-name.sql` |
| **Business profile link** | Tapping the business name on a listing opens their profile | `Listing` in `src/app/service/[id].tsx` |
| **Push notifications** | New messages, booking cards, booking reminders, plan ending | App side: `src/lib/push.ts`. What triggers them and their wording: `push_new_message()` and `plan_expiry_reminders()` in v14 section 7 |
| **Payments (provider-ready)** | Activates a plan automatically when your provider confirms a payment | `supabase/functions/payment-webhook/index.ts` (the part marked PROVIDER-SPECIFIC) |
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
- **Switch the booking app on/off** for a merchant: Merchants tab > **Booking on / Booking off**.
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

## 6. Payments (when you choose a provider)

1. Set `EXPO_PUBLIC_PAY_URL` in `.env` to the provider's payment page. The Pay button sends
   `merchant`, `tier`, `booking` and `amount` to it.
2. In `supabase/functions/payment-webhook/index.ts`, adapt `readPayment` to the provider's webhook
   format, and use their signature check if they offer one.
3. Deploy it (needs the Supabase tool, step 7):
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase secrets set PAYMENT_WEBHOOK_SECRET=a-long-random-password PAYMENT_PROVIDER=yourprovider
   npx supabase functions deploy payment-webhook --no-verify-jwt
   ```
4. Give the provider the webhook address: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/payment-webhook`.

The webhook checks the secret, ignores payments it has already seen, checks the amount matches the
plan, then activates the plan (one month + receipt). Remember the app-store rules: Apple and Google
generally require their own billing for things bought inside an app; taking payment on a website is
the usual approach. Check the current rules before publishing.

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
npx supabase migration repair --status applied 20261024000001 20261024000002 20261024000003 20261024000004 20261024000005 20261024000006 20261024000007 20261024000008 20261024000009 20261024000010 20261024000011 20261024000012 20261026000013 20261026000014
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
