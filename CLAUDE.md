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
Flag-inspired colours: blue `#0072C6` (main, trust), red `#CE1126`, black `#111111`, gold `#FCD116`; text `#14212B`; background `#FAFAF7`. Logo: blue map pin with an S; header logo is `assets/logo.png`. Shared styles are in `src/lib/theme.ts`. Flag ribbon (`flag` in theme.ts, used around the Home hero card): 3px, mostly blue (sides and long runs), with a centred flag motif: white, red, black, gold sun in the middle, mirrored. Reasons are in theme.ts. Whenever the flag colours are used, include all five, gold too.

## Business rules (do not change without asking)
Three subscription tiers, set only by the owner in Supabase (merchants can never choose or change their tier, page layout, priority or free booking):
| Tier (id) | Price | Listings | Priority in search | Booking app |
|---|---|---|---|---|
| Starter (`basic`) | 50 XCD/month | 1 | no | add-on |
| Growth (`plus`) | 100 XCD/month | 2 | yes (after Business) | add-on |
| Business (`premium`) | 170 XCD/month | 4 | top (first) | included |
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
- Search order (Home): Business listings first, then Growth, then Starter; newest first within each tier. This comes from `tiers.priority_rank` (premium 2, plus 1, basic 0), copied to `services.priority`.
- Opening animation (`src/components/Splash.tsx`, wired in `_layout.tsx`): about 3s, once per launch. The pin drops and bounces, the name slides in, a flag ribbon sweeps, then it fades to the app; it waits for the login check. Reduce-motion users get a still logo.
- Tags are search-only: merchants set them on Offer/Edit, search matches the whole phrase and each word against tags, and tags are never shown to customers.
- The login/sign-up screen uses TopBar (Back + logo). The "No services found" card has a red border and no button (Clear filter is next to Search).
- Messages: two-way chat. One `conversations` row per customer + listing (merchant_id set by trigger from the listing; you cannot message your own listing), many `messages`. Only the two participants can read or write (RLS). Read markers are set with `rpc('mark_conversation_read')`; a trigger keeps `last_message` / `last_message_at` and marks the sender as read. Live updates use Supabase Realtime on `messages` and `conversations`. Screens: `messages.tsx` (list for the current view), `chat/[id].tsx` (bubbles + reply), listing "Send note" starts or continues the chat (`src/lib/chat.ts`). The customer phone is optional (stored on the conversation; merchant sees Call/WhatsApp). `inbox.tsx` only redirects to Messages; the old `notes` table is no longer written.
- Phone privacy (one switch per business): `profiles.show_phone` (default on) and `profiles.public_phone` (generated: the number when on, null when off). Other people can read only `public_phone`; the real `phone` column is not readable by anon/authenticated, and its owner reads it with `rpc('my_phone')`. Customer screens (listing Call button, business profile) use `public_phone`. The "Show my phone number to customers" switch (`src/components/PhoneToggle.tsx`) is on Account (for users with listings), Offer a service and Edit listing; the phone is only required when it is on.
- Contact support (☰ menu, merchant view; `support.tsx`): tickets in `support_tickets` (topic billing/listing/account/other). Users can only create and read their own; the owner answers in Supabase Table Editor by filling `reply` and setting `status` to resolved (replied_at is set automatically), and the merchant sees it live.
- Receipts (Account, merchant view): one per row in `payments`. `src/lib/receipt.ts` builds a branded HTML receipt (number `SRV-<year>-<id>`); phones get a PDF via expo-print + expo-sharing, web opens Print / Save as PDF. Seller details are the `SELLER` constant there.
- Reviews (per LISTING since v12): `reviews` has `service_id`; 1-5 stars + optional comment, unique per (service_id, customer_id); `merchant_id` is set from the listing by trigger. Only customers with a conversation about that listing can insert; they can edit (rating, comment) but never add a second review of the same listing. `service_ratings` gives each listing's average + total (Home cards, listing page); `merchant_ratings` gives the whole business (business profile). The listing page shows that listing's reviews (latest 3) with Write/Edit; the business profile shows all the business's reviews, each labelled "About: <listing>". `reviews/[merchantId].tsx` lists all (optional `?service=` for one listing); `review/[serviceId].tsx` writes/edits. Merchants tap "Ask for a review" in a chat; the customer's Leave a review button opens that chat's listing.
- Home shows listings in swipeable rows (`src/components/ListingRow.tsx`): "Top businesses" (priority 2), "Popular picks" (1), "More local services" (0); cards have the cover, rating ("New" when none), a two-line title, business name and price. Web gets ‹ › buttons. Planned: one row per category once categories exist.
- Prices: `services.price_from` marks a starting price. `formatPrice` (`src/lib/price.ts`) shows "From EC$500", "EC$30" or "Ask for price" everywhere. Merchants set it with the From button inside the price box (`PriceInput`) on Offer and Edit.
- Customers send a **note** to a listing (phone/WhatsApp optional), which starts a two-way conversation. They do NOT book times yet.
- Photos: optional, max 5 per service, chosen when the service is published.
- Village is an optional field on services and in search. City/Village/text search ignores empty fields (there is no price filter).

## What exists
Guest browsing (no account needed to search, view listings and business profiles, or call; an account is needed to send a note, offer a service, or open Inbox/Plan; login returns the user to where they were, and a guest's typed note is sent after sign-up); login/signup; home screen (logo header, display name, ☰ menu for logged-in users or Log in for guests, hero card, search card with Clear filter and a blue Search button, results); Offer a service (business profile fields, service fields, photos); service page (tier layout, photo gallery, Call, Business profile, Send a note); public business profile; ☰ menu (`src/components/Menu.tsx`, light style: Browse, Messages, Bookings only when booking is on (Business tier or add-on), Merchant/Customer view toggle remembered on the device (`src/lib/mode.ts`), Account, Log out; red unread badge in merchant view); Account screen (edit name, bio, phone; merchant view adds plan status and own listings with visible/hidden status); customer Messages (`messages.tsx`, notes I sent); Bookings placeholder (`bookings.tsx`, coming soon); merchant Messages (`inbox.tsx`, Call and WhatsApp buttons; 7-digit numbers get the 1-268 code); Plan screen (booking checkbox on Starter/Growth); Edit listing; Supabase schema in `supabase/schema.sql`, then `supabase/upgrade-v4.sql`, then `supabase/upgrade-v5-guest-browse.sql`, then `supabase/upgrade-v6-tiers-booking.sql`, then `supabase/upgrade-v7-tier-order.sql`, then `supabase/upgrade-v8-messages.sql`, then `supabase/upgrade-v9-phone-privacy.sql`, then `supabase/upgrade-v10-support-reviews.sql`, then `supabase/upgrade-v11-price-from.sql`, then `supabase/upgrade-v12-listing-reviews.sql`.

## Not built yet (owner's priorities)
1. Deleting a listing.
2. Online payment connection and a webhook that calls `activate_plan`. Provider is NOT chosen: WiPay, First Atlantic Commerce and Dodo Payments were considered but each must confirm that an Antigua and Barbuda business can charge monthly XCD. Do not pick one for the owner.
3. The booking app (later): customer picks a date and time; the merchant confirms, declines, or proposes another time.
4. Settings screen, push notifications.

## Important cautions
- The code was written without being run. Expect small bugs; run `npx tsc --noEmit` and `npx expo-doctor` after changes.
- Never expose a Supabase service-role key in the app. Only the anon key goes in `.env`.
- Keep Row Level Security on every table; column-level grants stop merchants editing `tier_id`, `priority`, `booking_enabled`.
- App-store billing: Apple and Google generally require their own billing for paid features unlocked in-app. Charging merchants on the web is a common approach; check current rules before publishing.
- The owner is new to coding: explain what you are doing in plain English, make small steps, and ask before deleting files or changing the database design.
- `profiles` links to `tiers` twice (`tier_id` and `requested_tier`), so embed it as `tiers!tier_id(...)`, not `tiers(...)`, or Supabase returns "more than one relationship was found".
