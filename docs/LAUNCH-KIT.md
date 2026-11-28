# Servly launch kit (launch: 7 January 2027)

Owner's rule (2026-11-16): **everything is built and ready ahead of time**, so launching is only switching
things on when the owner says. Claude keeps this page current: when app code, prices, legal text or addresses
change, the affected item is rebuilt or marked "rebuild".

Marks: ✅ ready · 🔁 rebuild just before launch (one command) · ⛔ blocked (what it waits for) · 🟡 decision needed

## 1. Ready now
| Item | Status | Where | To switch it on |
|---|---|---|---|
| Launch website (the app on servlyag.com) | ✅ built 2026-11-16 · 🔁 rebuild after the last app change (`npm run build:web:launch`) | `launch/web` (not on GitHub) | Launch day: drag `launch/web` onto the APP's Netlify site, then section 4 |
| Coming soon page (servlyag.com until launch) | ✅ built (not online) | `coming-soon/out` | After ACB: steps in `coming-soon/README.md` (needs v38) |
| Database: v38 launch sign-up list | ✅ written, not run | `supabase/upgrade-v38-launch-list.sql` | Run in Supabase when the Coming soon page goes online |
| Database: v39 search insights | ✅ written, not run | `supabase/upgrade-v39-search-insights.sql` | Run any time (best before launch) |
| Store build settings (EAS production) | ✅ Supabase address + key and the payment page `https://servlyag.com/pay` are stored in EAS (2026-11-16) | Expo account > servly-ag > Environment variables | Nothing to do |
| Over-the-air updates | ✅ working (preview channel); store builds use the `production` channel | `eas.json` | `npx eas-cli update --channel production ...` after launch |
| ABST 17% | ✅ built, stays OFF | Admin > Promos > ABST | Not needed: Inland Revenue said Servly does not charge ABST (2026-11-20). Leave off. |
| Launch promo codes LAUNCH50 / LAUNCH50B | ✅ built, OFF | Admin > Promos | Launch day: switch LAUNCH50 on |
| Founding merchant free trials | ✅ built | Admin > Merchants > Free trial ends on (8 March 2027) | Any time, per merchant |

## 1b. Founders website (before launch; owner's decision 2026-11-23)
A public but UNLISTED copy of the app for founding businesses only (Netlify's free plan can't share a password: "Private" = owner only). Nothing links to it; the owner sends the link with each business's personal invite code. The link can be passed around, so: Pay is switched off in this build, the payment server only lets admins pay (secret PAYMENTS_ADMIN_ONLY = yes), and free trials need a personal code locked to the business's email.
| Item | Status | To do |
|---|---|---|
| Founders build (Pay off, no messages or calls: a "Servly opens on Thursday 7 January" notice instead) | ✅ built 2026-11-23 · 🔁 rebuild after app changes (`npm run build:web:founders`) | `founders/web` (not on GitHub) |
| Netlify: new site | ✅ online 2026-11-24 at **https://servly-founders.netlify.app** (checked: listings show the opening notice, no Call or note form) | To update it: rebuild, then drag `founders/web` onto this site's Deploys page |
| Supabase Auth URLs | owner | Authentication > URL Configuration: Site URL = the founders address (e.g. https://servly-founders.netlify.app) and add it to Redirect URLs (`https://servly-founders.netlify.app/**`), so sign-up and password emails work |
| Founders site redirect (launch day) | ✅ built 2026-11-24 | `founders-redirect/` (2 files: `_redirects` + a backup `index.html`). Launch day: drag the `founders-redirect` folder onto the founders site's Deploys page. Every founders link then opens the same page on servlyag.com |
| Payments locked to admins | ✅ secret PAYMENTS_ADMIN_ONLY = yes (2026-11-23) | Launch day: set it to no |

## 2. Decisions and accounts needed BEFORE the store builds
The store builds are the only things that can't be redone in minutes, so these come first:
| Item | Status | Why it matters |
|---|---|---|
| How merchants pay inside the phone apps (`docs/STORE-BILLING.md`) | 🟡 owner to decide | Apple/Google may reject a Pay button that only sends merchants to the website. The store builds must have the final behaviour. |
| Crash reporting (Sentry) | ✅ installed and wired 2026-11-17, OFF until the owner's Sentry DSN is added; needs a new build | Owner: create the free Sentry account + React Native project, send Claude the DSN. |
| iPhone notification sounds (WAV copies) | ⛔ not made yet (may need ffmpeg: ask first) | Built into the iPhone app. |
| Expo package updates | ✅ done 2026-11-27 (18 updated; types, 100 tests and expo-doctor 20/20 pass) | Do again right before the final builds if Expo releases more. |
| Apple Developer account (US$99/year) | ⛔ owner | No iPhone build can be made without it. |
| Google Play developer account (US$25 once) | ⛔ owner | Needed to submit (an Android build can be made before). |
| Store listings: descriptions, privacy forms | ✅ drafted 2026-11-27 in `docs/STORE-LISTING.md` | Paste at submission. servlyag.com must be online first (the stores open the privacy link). |
| Store screenshots | owner takes 6 on the phone (list in STORE-LISTING.md) | Claude sizes them for Apple and Google. |
| iPad support | ✅ phones only (owner 2026-11-28; app.json `supportsTablet` false) | No iPad screenshots needed. Proper iPad support can come in a later update. |

## 3. The store builds (made when section 2 is done, well before launch)
| Build | Status | Command (Claude runs it when the owner says) |
|---|---|---|
| Android (Google Play, .aab) | Trial store build ✅ built OK 2026-11-27 (build de32b3a0, versionCode 2, not uploaded). Final one waits on section 2 | `npx eas-cli build --platform android --profile production` |
| iPhone (App Store) | ⛔ waits on the Apple account and section 2 | `npx eas-cli build --platform ios --profile production` |
| Submit to the stores | after the builds and the store listings | `npx eas-cli submit --platform android` / `--platform ios` (review takes days: submit by mid-December) |

## 4. Launch day: switch-on list (in this order)
1. Netlify: remove servlyag.com from the Coming soon site, add it to the app site, make the app site **Public**. Then drag the `founders-redirect` folder onto the founders site (servly-founders.netlify.app) so its links go to servlyag.com. Do this AFTER servlyag.com works. Keep the founders site; don't delete it.
2. Supabase: Authentication > **Site URL** = `https://servlyag.com`; raise the email rate limit; Edge Functions secret **APP_URL** = `https://servlyag.com`; secret **PAYMENTS_ADMIN_ONLY = no** (opens payments to everyone).
3. CyberSource: live keys in Supabase secrets and **CYBS_ENV = live** (after ACB approval; ask CyberSource for Payment Tokenization on the live account). One small real payment as a check.
4. Admin > Promos: **LAUNCH50 on**.
5. Stores: release the approved apps.
6. Send the launch notice to the Coming soon sign-up list, then delete the list.
7. Launch-day watch: 30-minute checks running, website monitor on, owner watches Admin.

## Change log
- 2026-11-16: kit started. EAS payment page address added (preview: Netlify site; production: servlyag.com).
  Launch website built (`launch/web`).
- 2026-11-20: Launch website rebuilt (launch/web) with the first-time guide on every screen size and the new listing pages.
- 2026-11-23: Founding invite codes (v41, run). Launch website rebuilt.
- 2026-11-24: Founders website online at https://servly-founders.netlify.app. Launch-day redirect built (`founders-redirect/`). First-time guide fixed for phones with the browser's page zoom turned up (outlines landed in the wrong place; `src/lib/measure.ts`); founders, test and launch websites rebuilt.
- 2026-11-27: Expo packages updated. Trial Android store build (de32b3a0) and a new preview APK (db2b14c2, runtime 654516d9…) both built OK. Store listing text and privacy form answers drafted (docs/STORE-LISTING.md).
