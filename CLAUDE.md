# Servly AG: project notes for Claude Code

## What this app is
Servly AG ("Servly" when spoken) is a marketplace where local merchants list services (photographers, hairdressers, tutors, bus services, anything) and customers find them. Launch market: Antigua and Barbuda; later the wider Caribbean. Runs on Android, iOS and web from one codebase.
Tagline: "Whatever you need, someone's ready."

## Stack
- Expo + React Native + TypeScript, expo-router (routes live in `src/app/`). Use relative imports (no `@/` alias).
- Supabase: auth (email/password), Postgres with Row Level Security, Storage bucket `service-photos`.
- Env vars (in `.env`, never committed): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_PAY_URL` (empty until a payment provider is chosen).
- Bundle id / Android package: `ag.servly.app` (matches a servly.ag domain; confirm before first store publish).
- Test on Android with Expo Go (no custom native code yet).

## Brand
Flag-inspired colours: blue `#0072C6` (main, trust), red `#CE1126`, black `#111111`, gold `#FCD116`; text `#14212B`; background `#FAFAF7`. Logo: blue map pin with an S; header logo is `assets/logo.png`. Shared styles are in `src/lib/theme.ts`.

## Business rules (do not change without asking)
Three subscription tiers, set only by the owner in Supabase (merchants can never choose or change their tier, page layout, priority or free booking):
| Tier (id) | Price | Listings | Priority in search | Booking app |
|---|---|---|---|---|
| Starter (`basic`) | 50 XCD/month | 1 | no | add-on |
| Growth (`plus`) | 100 XCD/month | 2 | yes | add-on |
| Business (`premium`) | 150 XCD/month | unlimited | yes | included |
- All tiers: public business profile, direct customer messaging (notes) and call.
- Booking add-on: 25 XCD/month, per merchant. Starter/Growth merchants tick a checkbox on the Plan screen (`profiles.booking_requested`); `activate_plan` then charges the add-on and switches on `booking_enabled` for all their listings. (`services.booking_requested` is no longer used.)
- Merchant view: only users with at least one listing can switch between Customer and Merchant view (menu and Account). Publishing a first listing switches them to Merchant view.
- Merchants edit a listing (business details, service fields, photos) in `src/app/edit/[id].tsx`, reached from Account or the listing page. Hiding/showing a listing is not offered (re-showing could get around the tier's listing limit).
- Page layout (basic/plus/premium) comes only from the merchant's tier; see `Listing` in `src/app/service/[id].tsx`. The three layouts are placeholders until the owner defines them.
- Listings are visible to customers only while the merchant's `plan_expires_at` is in the future. Plans are activated by `select public.activate_plan('MERCHANT-ID','plus');` (adds one month, logs a payment).
- Photos: photo 1 is the cover (logo or best photo) shown on search, business and Account cards (`src/components/Cover.tsx`); photos 2-5 show as "Our work" on the listing page. Edit listing can reorder with "Make cover".
- Offer a service shows plans first when the merchant has no active or chosen plan (Plan → Checkout → "Continue: create your listing"), shows "n of m listings used", and blocks the form at the limit. The limit is the PAID tier (database trigger), so an unpaid Growth choice still allows 1 listing until payment.
- Choosing a plan goes straight to `checkout.tsx` (order summary + Pay). Pay opens `EXPO_PUBLIC_PAY_URL`; until a provider is set it shows "Online payment is not connected yet".
- The owner viewing their own listing in merchant view sees a preview: banner "This is how customers see your listing" + Edit listing; Call, Business profile and the note form are disabled.
- Every inner screen uses `TopBar` (`src/components/Menu.tsx`): ← Back left, small Servly logo centred (tap = Home via `router.dismissTo('/')`), ☰ right.
- Customers send a **note** (plus a phone/WhatsApp number) to a listing. They do NOT book times yet.
- Photos: optional, max 5 per service, chosen when the service is published.
- Village is an optional field on services and in search. City/Village/text search ignores empty fields (there is no price filter).

## What exists
Guest browsing (no account needed to search, view listings and business profiles, or call; an account is needed to send a note, offer a service, or open Inbox/Plan; login returns the user to where they were, and a guest's typed note is sent after sign-up); login/signup; home screen (logo header, display name, ☰ menu for logged-in users or Log in for guests, hero card, search card with Clear filter and a blue Search button, results); Offer a service (business profile fields, service fields, photos); service page (tier layout, photo gallery, Call, Business profile, Send a note); public business profile; ☰ menu (`src/components/Menu.tsx`, light style: Browse, Messages, Bookings only when booking is on (Business tier or add-on), Merchant/Customer view toggle remembered on the device (`src/lib/mode.ts`), Account, Log out; red unread badge in merchant view); Account screen (edit name, bio, phone; merchant view adds plan status and own listings with visible/hidden status); customer Messages (`messages.tsx`, notes I sent); Bookings placeholder (`bookings.tsx`, coming soon); merchant Messages (`inbox.tsx`, Call and WhatsApp buttons; 7-digit numbers get the 1-268 code); Plan screen (booking checkbox on Starter/Growth); Edit listing; Supabase schema in `supabase/schema.sql`, then `supabase/upgrade-v4.sql`, then `supabase/upgrade-v5-guest-browse.sql`, then `supabase/upgrade-v6-tiers-booking.sql`.

## Not built yet (owner's priorities)
1. Deleting a listing.
2. Online payment connection and a webhook that calls `activate_plan`. Provider is NOT chosen: WiPay, First Atlantic Commerce and Dodo Payments were considered but each must confirm that an Antigua and Barbuda business can charge monthly XCD. Do not pick one for the owner.
3. The booking app (later): customer picks a date and time; the merchant confirms, declines, or proposes another time.
4. Settings screen, push notifications, reviews.

## Important cautions
- The code was written without being run. Expect small bugs; run `npx tsc --noEmit` and `npx expo-doctor` after changes.
- Never expose a Supabase service-role key in the app. Only the anon key goes in `.env`.
- Keep Row Level Security on every table; column-level grants stop merchants editing `tier_id`, `priority`, `booking_enabled`.
- App-store billing: Apple and Google generally require their own billing for paid features unlocked in-app. Charging merchants on the web is a common approach; check current rules before publishing.
- The owner is new to coding: explain what you are doing in plain English, make small steps, and ask before deleting files or changing the database design.
- `profiles` links to `tiers` twice (`tier_id` and `requested_tier`), so embed it as `tiers!tier_id(...)`, not `tiers(...)`, or Supabase returns "more than one relationship was found".
