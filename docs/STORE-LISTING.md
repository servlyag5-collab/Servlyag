# Servly AG: store listing text and privacy form answers

Drafted 2026-11-27, ready to paste into Google Play Console and App Store Connect.
Keep in step with the Privacy Policy (`src/lib/legal.ts`): if the policy changes, check the privacy answers here.

## Before you submit: the links must work
Both stores open the Privacy Policy link while reviewing. **servlyag.com is not online yet**, so before submitting,
either the Coming soon page or the launch website must be on servlyag.com (both have the privacy, terms and contact pages).

| What the store asks for | Link |
|---|---|
| Privacy policy | https://servlyag.com/privacy |
| Support / contact | https://servlyag.com/contact |
| Marketing / website | https://servlyag.com |
| Terms (Apple: "License agreement", optional) | https://servlyag.com/terms |
| Account deletion (Google asks for a web link) | https://servlyag.com/account (log in > Delete my account), or email servlyag5@gmail.com |
| Support email | servlyag5@gmail.com |
| Support phone | +1 (268) 773-7859 |

## Names and short text
- **App name:** Servly AG
- **Apple subtitle (max 30):** `Local services in Antigua` (25)
- **Google short description (max 80):** `Find and message local services in Antigua and Barbuda. Free for customers.` (76)
- **Apple promotional text (max 170, can change any time without review):** `Servly opens Thursday 7 January. Find photographers, hairdressers, caterers, tutors and more across Antigua and Barbuda, and message them in the app.`
- **Apple keywords (max 100, commas, no spaces):** `antigua,barbuda,services,local,business,hair,nails,photographer,caterer,tutor,booking,caribbean` (96)
- **Category:** Lifestyle (Google: Lifestyle). Second category on Apple: Business.

## Full description (Google max 4000 · Apple max 4000)
```
Whatever you need, someone's ready.

Servly AG brings local businesses in Antigua and Barbuda into one app. Find a photographer for the wedding, a hair or nail technician for Saturday, a caterer for the christening, a tutor for exams, a bus for the trip, and much more.

FOR CUSTOMERS (free)
• Search by service, business name, parish or village
• See photos of each business's work, prices, opening hours and reviews
• Send a note to a business and chat in the app, or tap Call
• Book appointments with businesses that take bookings, and get reminders
• Leave a review after you've been in touch with a business
• Browse without an account; sign up only when you want to send a note

FOR BUSINESSES
• Your own listing and business profile, with up to 5 photos per listing
• Customers message you directly in the app, and can call you if you choose to show your number
• Choose whether your phone number is shown to customers
• Opening hours, prices ("From EC$...") and reviews you can reply to
• Bookings calendar with automatic reminders (included with Business, or as an upgrade)
• Monthly plans in Eastern Caribbean dollars: Starter, Growth and Business

SAFE AND LOCAL
• Report a listing, review or user, and block anyone you don't want to hear from
• Delete your account at any time from Account
• Made in Antigua and Barbuda for Antigua and Barbuda

Questions? servlyag5@gmail.com · +1 (268) 773-7859 · servlyag.com
```
Note: payment wording ("monthly plans") must match the final payment decision before submitting.

## Age rating questionnaires
Answer honestly from what the app does:
- Violence, sexual content, profanity, drugs, gambling, horror: **None**.
- Users can talk to each other (messages): **Yes**. Users can share their phone number: **Yes** (optional).
- User-generated content (listings, photos, reviews): **Yes**, with reporting, blocking and admin removal.
- Shares the user's location: **No** (parish and village are typed, not taken from the phone).
- Buying in the app: depends on the payment decision (update this answer then).
- Expected result: Apple **12+** or **13+**, Google **Teen** or **Everyone** (the questionnaire decides). Our Terms say 16+ to have an account; that's allowed alongside a lower store rating.

## Apple: App Privacy ("nutrition label")
- **Do you or your partners use data to track users (across other companies' apps or websites)?** No.
- **Data collected** (each one: used for App Functionality; Linked to the user unless it says otherwise; not used for tracking):

| Apple data type | Collected? | Linked? | What it is in Servly |
|---|---|---|---|
| Contact info > Name | Yes | Linked | Screen name, business name |
| Contact info > Email address | Yes | Linked | Login email |
| Contact info > Phone number | Yes | Linked | Business phone; customers can choose to share one in a chat |
| User content > Photos or videos | Yes | Linked | Listing photos |
| User content > Emails or text messages | Yes | Linked | In-app messages and notes |
| User content > Customer support | Yes | Linked | Contact support tickets |
| User content > Other user content | Yes | Linked | Reviews, replies, reports, listings |
| Purchases > Purchase history | Yes | Linked | Plans paid, receipts (merchants) |
| Financial info > Payment info | Yes | Linked | Card type and last 4 digits for automatic payments (the full card stays with CyberSource) |
| Identifiers > User ID | Yes | Linked | Account id |
| Search history | Yes | **Not linked** | Search words, parish, village (no user id stored) |
| Usage data > Product interaction | Yes | **Not linked** | Call button taps (which business, not who) |
| Diagnostics > Crash data | Yes | **Not linked** | Sentry crash reports, no personal data |
| Location, contacts, health, browsing history, sensitive info, advertising data | No | | |

## Google Play: Data safety
- **Does the app collect or share any of the required user data types?** Yes.
- **Is all data encrypted in transit?** Yes (HTTPS).
- **Can users request data deletion?** Yes: in the app (Account > Delete my account) and by email.
- **Shared with third parties?** No. (Supabase, Expo, Resend, Sentry and CyberSource work on Servly's behalf; Google counts these "service providers" as not sharing.)
- **Collected** (purpose: App functionality; Account management where it says so; none optional unless marked):

| Google data type | Collected | Purpose / notes |
|---|---|---|
| Personal info > Name | Yes | App functionality, Account management |
| Personal info > Email address | Yes | Account management |
| Personal info > Phone number | Yes (optional for customers) | App functionality |
| Financial info > Purchase history | Yes | App functionality (merchant plans, receipts) |
| Financial info > User payment info | Yes | Card type and last 4 digits only |
| Messages > Other in-app messages | Yes | App functionality |
| Photos and videos > Photos | Yes (optional) | Listing photos |
| App activity > In-app search history | Yes | Analytics (not tied to a person) |
| App activity > Other user-generated content | Yes | Reviews, listings, reports |
| App activity > App interactions | Yes | Analytics (call button taps, not tied to a person) |
| App info and performance > Crash logs | Yes | Analytics (Sentry) |
| Device or other IDs | Yes | Notification address (push token), App functionality |
| Location, contacts, calendar, health, files, audio, web history | No | |

## For the reviewers (both stores ask)
- A **test login** (email + password) with a merchant listing, so reviewers can see both views. Claude can set one up in Supabase; the password is given to the store only, never posted anywhere public.
- **Notes:** "Servly is a marketplace for local service businesses in Antigua and Barbuda. Browsing is free without an account. The test account is a merchant: use ☰ > Merchant view to see the business side."

## Screenshots
| Store | Size needed | How many |
|---|---|---|
| Apple iPhone 6.9" | 1320 x 2868 | 3 to 10 (required) |
| Apple iPad 13" | not needed | the app is phones only (owner 2026-11-28) |
| Google phone | e.g. 1080 x 1920 or 1080 x 2400 | 2 to 8 |
| Google feature graphic | 1024 x 500 | 1 (required) |
Suggested screens, in order: Home with the hero and search · search results · a Business-plan listing page · a chat with a booking card · a business profile with reviews · Offer a service (for businesses).
