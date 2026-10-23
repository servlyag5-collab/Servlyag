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
2. SQL Editor > paste `supabase/schema.sql` > Run. Then paste `supabase/upgrade-v4.sql` > Run. Then paste `supabase/upgrade-v5-guest-browse.sql` > Run (lets people browse without an account). Then paste `supabase/upgrade-v6-tiers-booking.sql` > Run (tier names Starter/Growth/Business and the booking checkbox on the Plan screen). Then paste `supabase/upgrade-v7-tier-order.sql` > Run (Business listings show first, then Growth, then Starter).
3. Authentication > Providers > Email: turn OFF "Confirm email" while testing.
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
| Price | 50 XCD/mo | 100 XCD/mo | 150 XCD/mo |
| Business profile, messaging and call | yes | yes | yes |
| Service listings | 1 | 2 | unlimited |
| Placement in search | after Growth and Business | after Business | first (top) |
| Booking app | paid add-on (checkbox on Plan screen) | paid add-on (checkbox on Plan screen) | included |

Merchants cannot pick their tier or page layout. Only you can, in Supabase: Table Editor > `profiles` > `tier_id` (`basic` = Starter, `plus` = Growth, `premium` = Business). Prices, limits and priority live in the `tiers` table. Layouts are in `src/app/service/[id].tsx` (`Listing`). Priority and the free booking flag are set by database triggers, not by the app. When a Starter/Growth merchant ticks the booking box on the Plan screen, it is saved as `profiles.booking_requested`; when you run `activate_plan` after they pay, the add-on is charged and booking is switched on for all their listings. Payments are manual for now.

## Notes inbox, photos, plans
- **Inbox:** merchants see notes about their services (unread ones highlighted), with Call and WhatsApp buttons for the customer's number.
- **Photos:** up to 5 per service, optional, chosen when the service is published and changeable later on the Edit listing screen (JPEG/PNG/WebP, max 5 MB each).
- **Plan screen:** the merchant chooses a tier (saved as a request). Listings are hidden from customers until the plan is active. You activate a plan after payment: `select public.activate_plan('MERCHANT-USER-ID', 'plus');` (the booking add-on is included automatically if they ticked it). It adds one month and logs the payment in `payments`.
- **Online payment:** not connected yet. When you pick a provider, put its payment page in `.env` as `EXPO_PUBLIC_PAY_URL`; the Pay button then opens it with `merchant`, `tier`, `booking` and `amount` in the link. A webhook that calls `activate_plan` comes next.
- **Booking add-on:** 25 XCD / month (table `addons`).

## Next: the booking app
Customer picks a date and time; the merchant confirms, declines, or proposes another time.

## Not built yet
The booking app, online payment connection, deleting a listing, Settings screen, push notifications, reviews.
