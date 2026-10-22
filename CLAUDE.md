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
| Tier 1 (`basic`) | 50 XCD/month | 1 | no | add-on |
| Tier 2 (`plus`) | 100 XCD/month | 2 | yes | add-on |
| Tier 3 (`premium`) | 150 XCD/month | unlimited | yes | included |
- All tiers: public business profile, direct customer messaging (notes) and call.
- Booking add-on: 25 XCD/month (assumed monthly, per merchant). Merchant ticks a checkbox (`booking_requested`); the owner switches on `booking_enabled` after payment.
- Page layout (basic/plus/premium) comes only from the merchant's tier; see `Listing` in `src/app/service/[id].tsx`. The three layouts are placeholders until the owner defines them.
- Listings are visible to customers only while the merchant's `plan_expires_at` is in the future. Plans are activated by `select public.activate_plan('MERCHANT-ID','plus');` (adds one month, logs a payment).
- Customers send a **note** (plus a phone/WhatsApp number) to a listing. They do NOT book times yet.
- Photos: optional, max 5 per service, chosen when the service is published.
- Village is an optional field on services and in search. City/Village/price/text search ignores empty fields.

## What exists
Guest browsing (no account needed to search, view listings and business profiles, or call; an account is needed to send a note, offer a service, or open Inbox/Plan; login returns the user to where they were, and a guest's typed note is sent after sign-up); login/signup; home screen (logo header, display name, Inbox with unread count, Plan, Log out, hero card, search card with Clear filter and a blue Search button, results); Offer a service (business profile fields, service fields, photos, booking checkbox); service page (tier layout, photo gallery, Call, Business profile, Send a note); public business profile; merchant Inbox (Call and WhatsApp buttons; 7-digit numbers get the 1-268 code); Plan screen; Supabase schema in `supabase/schema.sql`, then `supabase/upgrade-v4.sql`, then `supabase/upgrade-v5-guest-browse.sql`.

## Not built yet (owner's priorities)
1. Edit/manage my listings (including editing photos after publishing).
2. Online payment connection and a webhook that calls `activate_plan`. Provider is NOT chosen: WiPay, First Atlantic Commerce and Dodo Payments were considered but each must confirm that an Antigua and Barbuda business can charge monthly XCD. Do not pick one for the owner.
3. The booking app (later): customer picks a date and time; the merchant confirms, declines, or proposes another time.
4. Hamburger menu, Settings screen, push notifications, reviews.

## Important cautions
- The code was written without being run. Expect small bugs; run `npx tsc --noEmit` and `npx expo-doctor` after changes.
- Never expose a Supabase service-role key in the app. Only the anon key goes in `.env`.
- Keep Row Level Security on every table; column-level grants stop merchants editing `tier_id`, `priority`, `booking_enabled`.
- App-store billing: Apple and Google generally require their own billing for paid features unlocked in-app. Charging merchants on the web is a common approach; check current rules before publishing.
- The owner is new to coding: explain what you are doing in plain English, make small steps, and ask before deleting files or changing the database design.
