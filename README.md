# Servly AG

Whatever you need, someone's ready. Expo + React Native (iOS, Android, web) with a Supabase back end.
Bundle ID / Android package: `ag.servly.app` (matches servly.ag; change before first publish if you pick another domain).

## 1. Create the project shell (from the folder where you want it)
    npx create-expo-app@latest servly-ag --template blank-typescript
    cd servly-ag
    npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar react-native-url-polyfill @react-native-async-storage/async-storage react-native-web react-dom @expo/metro-runtime expo-image-picker
    npm install @supabase/supabase-js
    npm pkg set main=expo-router/entry
    rm -f App.tsx index.ts

## 2. Copy this kit into it
Copy `src/`, `assets/`, `supabase/`, `app.json` and `.env.example` from this folder into `servly-ag/` (overwrite when asked).

## 3. Supabase
1. supabase.com > New project `servly`.
2. SQL Editor > paste `supabase/schema.sql` > Run. Then paste `supabase/upgrade-v4.sql` > Run. Then paste `supabase/upgrade-v5-guest-browse.sql` > Run (lets people browse without an account). Then paste `supabase/upgrade-v6-tiers-booking.sql` > Run (tier names Starter/Growth/Business and the booking checkbox on the Plan screen). Then paste `supabase/upgrade-v7-tier-order.sql` > Run (Business listings show first, then Growth, then Starter). Then paste `supabase/upgrade-v8-messages.sql` > Run (two-way messages between customers and merchants; existing notes are copied in). Then paste `supabase/upgrade-v9-phone-privacy.sql` > Run (merchants can hide their phone number from customers). Then paste `supabase/upgrade-v10-support-reviews.sql` > Run (contact support and reviews). Then paste `supabase/upgrade-v11-price-from.sql` > Run ("From" starting prices). Then paste `supabase/upgrade-v12-listing-reviews.sql` > Run (reviews belong to a listing, not the whole business). Then paste `supabase/upgrade-v13-bookings.sql` > Run (the booking app and its reminders; Supabase warns about a "destructive" line, which only widens the allowed message types). Then paste `supabase/upgrade-v14-launch-ready.sql` > Run (admin dashboard, reports, blocking, review replies, delete account, better search, push notifications), and make yourself an admin with the line at the top of that file.

**Owner's guide:** `docs/OWNER-GUIDE.md` explains every feature, which file to change, and the steps for push notifications, phone builds, payments and migrations.
3. Authentication > Providers > Email: turn OFF "Confirm email" while testing.
   Authentication > URL Configuration > Redirect URLs: add `http://localhost:8081/reset-password`, `http://127.0.0.1:8081/reset-password`, `servlyag://reset-password` and `exp://**` (so "Forgot password?" links open the app's Set a new password screen). Add your real website's `/reset-password` address when you publish.
   Supabase's built-in email only sends a few emails an hour and only to your Supabase team's addresses. Before real customers can get password reset emails, connect an email provider under Authentication > Emails > SMTP Settings.
4. Settings > API: copy the Project URL and anon key into a new file `.env` (see `.env.example`). Add `.env` to `.gitignore`.

## 4. Run
    npx expo start
Press `w` for the web version.

**On your Android phone:** install **Expo Go** from the Google Play Store, open it, tap "Scan QR code", and scan the code shown in the terminal. Phone and computer must be on the same Wi-Fi. If that fails, run `npx expo start --tunnel` instead.

**Publishing on Android (later):** create a Google Play developer account, then build in the cloud (no Android Studio needed):

    npm install -g eas-cli
    eas login
    eas build --platform android --profile production

## Subscription tiers
| | Starter | Growth | Business |
|---|---|---|---|
| Price | 50 XCD/mo | 100 XCD/mo | 170 XCD/mo |
| Business profile, messaging and call | yes | yes | yes |
| Service listings | 1 | 2 | 4 |
| Placement in search | after Growth and Business | after Business | first (top) |
| Booking app | paid add-on (checkbox on Plan screen) | paid add-on (checkbox on Plan screen) | included |

Merchants cannot pick their tier or page layout. Only you can, in Supabase: Table Editor > `profiles` > `tier_id` (`basic` = Starter, `plus` = Growth, `premium` = Business). Prices, limits and priority live in the `tiers` table. Layouts are in `src/app/service/[id].tsx` (`Listing`). Priority and the free booking flag are set by database triggers, not by the app. When a Starter/Growth merchant ticks the booking box on the Plan screen, it is saved as `profiles.booking_requested`; when you run `activate_plan` after they pay, the add-on is charged and booking is switched on for all their listings. Payments are manual for now.

## Notes inbox, photos, plans
- **Messages:** customers and merchants chat in the app, one conversation per customer per listing, updating live. Unread conversations are highlighted and counted on the ☰ menu. Merchants get Call and WhatsApp buttons when the customer left a number.
- **Photos:** up to 5 per service, optional, chosen when the service is published and changeable later on the Edit listing screen (JPEG/PNG/WebP, max 5 MB each).
- **Plan screen:** the merchant chooses a tier (saved as a request). Listings are hidden from customers until the plan is active. You activate a plan after payment: `select public.activate_plan('MERCHANT-USER-ID', 'plus');` (the booking add-on is included automatically if they ticked it). It adds one month and logs the payment in `payments`.
- **Online payment:** not connected yet. When you pick a provider, put its payment page in `.env` as `EXPO_PUBLIC_PAY_URL`; the Pay button then opens it with `merchant`, `tier`, `booking` and `amount` in the link. A webhook that calls `activate_plan` comes next.
- **Booking add-on:** 25 XCD / month (table `addons`).
- **Support:** merchants use Contact support in the ☰ menu. Read and answer in Table Editor > `support_tickets`: type your answer in `reply` and set `status` to `resolved`.
- **Receipts:** every payment logged by `activate_plan` appears under Account > Receipts with a Download button. Put your business details in `SELLER` in `src/lib/receipt.ts`.
- **Reviews:** each review is about one listing. Customers who have messaged about a listing can leave one review of it (1-5 stars) and edit it later. The business profile shows all of a business's reviews together. Merchants can tap "Ask for a review" in a chat.

## Demo businesses (for testing)
To see the app with real-looking merchants, run `supabase/demo-accounts.sql` in the SQL Editor: 10 made-up businesses (5 Starter, 3 Growth, 2 Business) with listings and active plans. Their emails end in `@demo.servly.test`, they have no password, and their phone numbers are fake 555 numbers. Remove them all with `supabase/demo-accounts-remove.sql`.

## Booking app
Merchants with the booking app (Business plan, or the add-on) open a customer's chat and tap "Book this customer", pick a date and time, and send it. The customer taps Confirm or Decline on the booking card. Merchants can cancel from the chat or the Bookings screen. Confirmed bookings get reminder messages in the chat 5 days and 3 days before (9:00 AM Antigua time) and on the day (7:00 AM). Customers see theirs under My bookings.

## Not built yet
An email provider (SMTP), a chosen payment provider, deleting a listing, Settings screen, push notifications.
