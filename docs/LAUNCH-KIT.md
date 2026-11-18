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
| ABST 17% | ✅ built, OFF | Admin > Promos > ABST | Once registered with Inland Revenue: number + Switch on |
| Launch promo codes LAUNCH50 / LAUNCH50B | ✅ built, OFF | Admin > Promos | Launch day: switch LAUNCH50 on |
| Founding merchant free trials | ✅ built | Admin > Merchants > Free trial ends on (8 March 2027) | Any time, per merchant |

## 2. Decisions and accounts needed BEFORE the store builds
The store builds are the only things that can't be redone in minutes, so these come first:
| Item | Status | Why it matters |
|---|---|---|
| How merchants pay inside the phone apps (`docs/STORE-BILLING.md`) | 🟡 owner to decide | Apple/Google may reject a Pay button that only sends merchants to the website. The store builds must have the final behaviour. |
| Crash reporting (e.g. Sentry) | 🟡 owner to OK the install | It lives inside the app, so it must be in the store builds (launch-day watch plan). |
| iPhone notification sounds (WAV copies) | ⛔ not made yet (may need ffmpeg: ask first) | Built into the iPhone app. |
| Expo package updates (16 small ones) | ⛔ not done (ask first) | Best done once, before the final builds, then retest. |
| Apple Developer account (US$99/year) | ⛔ owner | No iPhone build can be made without it. |
| Google Play developer account (US$25 once) | ⛔ owner | Needed to submit (an Android build can be made before). |
| Store listings: screenshots, descriptions, privacy forms (Search history: not linked to the user) | ⛔ to prepare | Asked for at submission. |

## 3. The store builds (made when section 2 is done, well before launch)
| Build | Status | Command (Claude runs it when the owner says) |
|---|---|---|
| Android (Google Play, .aab) | ⛔ waits on section 2; a trial build can be made now to catch problems early | `npx eas-cli build --platform android --profile production` |
| iPhone (App Store) | ⛔ waits on the Apple account and section 2 | `npx eas-cli build --platform ios --profile production` |
| Submit to the stores | after the builds and the store listings | `npx eas-cli submit --platform android` / `--platform ios` (review takes days: submit by mid-December) |

## 4. Launch day: switch-on list (in this order)
1. Netlify: remove servlyag.com from the Coming soon site, add it to the app site, make the app site **Public**.
2. Supabase: Authentication > **Site URL** = `https://servlyag.com`; raise the email rate limit; Edge Functions secret **APP_URL** = `https://servlyag.com`.
3. CyberSource: live keys in Supabase secrets and **CYBS_ENV = live** (after ACB approval; ask CyberSource for Payment Tokenization on the live account). One small real payment as a check.
4. Admin > Promos: **LAUNCH50 on**.
5. Stores: release the approved apps.
6. Send the launch notice to the Coming soon sign-up list, then delete the list.
7. Launch-day watch: 30-minute checks running, website monitor on, owner watches Admin.

## Change log
- 2026-11-16: kit started. EAS payment page address added (preview: Netlify site; production: servlyag.com).
  Launch website built (`launch/web`).
