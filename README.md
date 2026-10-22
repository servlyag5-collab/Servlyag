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
2. SQL Editor > paste `supabase/schema.sql` > Run. Then paste `supabase/upgrade-v4.sql` > Run. Then paste `supabase/upgrade-v5-guest-browse.sql` > Run (lets people browse without an account).
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
| | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Price | 50 XCD/mo | 100 XCD/mo | 150 XCD/mo |
| Business profile, messaging and call | yes | yes | yes |
| Service listings | 1 | 2 | unlimited |
| Priority placement in search | no | yes | yes |
| Booking app | paid add-on (checkbox) | paid add-on (checkbox) | included |

Merchants cannot pick their tier or page layout. Only you can, in Supabase: Table Editor > `profiles` > `tier_id` (`basic` = Tier 1, `plus` = Tier 2, `premium` = Tier 3). Prices, limits and priority live in the `tiers` table. Layouts are in `src/app/service/[id].tsx` (`Listing`). Priority and the free booking flag are set by database triggers, not by the app. When a Tier 1/2 merchant ticks the booking box, it is saved as `booking_requested`; after they pay, you switch on `booking_enabled` (SQL at the bottom of `schema.sql`). Payments are manual for now.

## Notes inbox, photos, plans
- **Inbox:** merchants see notes about their services (unread ones highlighted), with Call and WhatsApp buttons for the customer's number.
- **Photos:** up to 5 per service, optional, chosen when the service is published (JPEG/PNG/WebP, max 5 MB each).
- **Plan screen:** the merchant chooses a tier (saved as a request). Listings are hidden from customers until the plan is active. You activate a plan after payment: `select public.activate_plan('MERCHANT-USER-ID', 'plus');` (add `true` as the third value if they also paid for the booking add-on). It adds one month and logs the payment in `payments`.
- **Online payment:** not connected yet. When you pick a provider, put its payment page in `.env` as `EXPO_PUBLIC_PAY_URL`; the Pay button then opens it with `merchant`, `tier` and `amount` in the link. A webhook that calls `activate_plan` comes next.
- **Booking add-on:** 25 XCD / month (table `addons`).

## Next: the booking app
Customer picks a date and time; the merchant confirms, declines, or proposes another time.

## Not built yet
The booking app, online payment connection, editing a listing's photos after publishing, hamburger menu and Settings screen, push notifications, reviews.
