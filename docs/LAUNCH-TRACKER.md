# Servly AG: launch tracker

The daily brief (`/daily-brief`) reads this file every morning. It is your single list of what is
done, what is next, and what is waiting on someone. Tick a box by changing `[ ]` to `[x]` and adding
the date, or just tell Claude "mark X as done" and it will update it.

Marks: `[x]` done · `[ ]` to do · `[?]` not sure yet (please confirm) · `[~]` waiting on someone else

Launch date: **15 December 2026 or 7 January 2027** (not final yet)

---

## Stage 1: Finish the app (now)

### Built
- [x] Guest browsing, sign-up/login, password reset screens (2026-10-24)
- [x] Offer a service, edit listing, photos with framing, opening hours, tags (2026-10-28)
- [x] Two-way messages, phone privacy, reviews, support tickets, receipts (2026-10-24)
- [x] Three plans, plan screen, checkout, moving to a smaller plan (2026-10-29)
- [x] Booking app (Business tier or Bookings upgrade) (2026-10-24)
- [x] Admin dashboard, reports, blocking, push notification code (2026-10-26)
- [x] Search as you type, Home swipe rows, full-width website layout (2026-10-29)
- [x] Free trials for Founding Merchants, LAUNCH50 promo codes (2026-11-01)

### Still to build (owner's priorities, in order)
- [x] Deleting a listing (2026-11-12, database v35: merchant and admin)
- [x] Payment connection + webhook that activates plans (first full test payment 2026-11-10)
- [ ] Settings screen
- [ ] Final layouts for the three listing page designs (Starter / Growth / Business are placeholders)

### Database updates run in Supabase
- [x] All updates up to v30 run (v25 on 2026-11-02; v27-v29 on 2026-11-03; v30 on 2026-11-06; check passes)
- [x] Run v31 (fair turns in search) (database check shows it installed, 2026-11-07)
- [x] Run v32 and v33 (card payments, monthly charges) (database check shows both installed, 2026-11-11)
- [x] You are an admin (`admins` table, OWNER-GUIDE section 1) (owner confirmed 2026-11-02)
- v21 is replaced by v24/v25 (no need to run it)

---

## Stage 2: Things only you can decide or set up

- [x] **Business registered** (owner, by 2026-11-06)
- [ ] **Register with Inland Revenue** (not done yet, owner 2026-11-06)
- [x] **Went to ACB** (2026-11-06). Payments will run through ACB using **CyberSource**. Fees: 75 USD
  (about 202.50 XCD) a month + 4% of every payment. Full list and gaps: `docs/ACB-REQUIREMENTS.md`
- [ ] **Website ready for ACB's review** (see `docs/ACB-REQUIREMENTS.md`): live servlyag.com, full
  address, support email + phone, public pricing page, delivery + security + restrictions wording, card logos
- [x] Business address: Old Road Village, St. Mary's Parish, Antigua (2026-11-06)
- [x] Support email: servlyag5@gmail.com (2026-11-06)
- [ ] **Support phone number**: owner getting a separate business number (not the personal one)
- [ ] **Ask ACB the follow-up questions** (XCD, monthly charges, webhooks, test account, when the fee starts)
- [x] CyberSource test (sandbox) account created (2026-11-06); Organization ID servlyag_1793983604
- [x] CyberSource test profile "Servly Test": keys created (Profile ID, Access Key, Secret Key in password manager), return and notification addresses filled in (2026-11-07)
- [x] CyberSource confirmed (2026-11-07): profile "Servly Test" active, Secure Acceptance configured, Token Management, Recurring Billing and **XCD** available in the sandbox
- [x] CyberSource webhook digital signature key created and saved in the password manager; rep confirmed webhook security is ready (2026-11-07)
- [ ] CyberSource webhook subscription (payment + recurring billing): endpoint live and accepts test messages (2026-11-11); waiting on the rep to subscribe and run the delivery test
- [x] CyberSource REST key created and added to Supabase secrets (2026-11-10)
- [x] Put the CyberSource keys into Supabase > Edge Functions > Secrets (2026-11-10: the first test payment through Servly worked, so the keys are in)
- [x] Build the first-payment connection (Claude, 2026-11-07: Pay button, secure card page, return page, webhook, database v32; tests pass; not yet online)
- [x] Run v32 (card payments) in Supabase > SQL Editor (database check shows it installed, 2026-11-07)
- [x] Add the CyberSource secrets in Supabase > Edge Functions > Secrets (2026-11-10, same evidence as above)
- [x] Put the payment functions online, then a test payment (2026-11-10: Growth + bookings, 125.00 XCD, paid)
- [x] Build the automatic monthly charge (Claude, 2026-11-10: database v33 + payment-renewals; online; first real charge waits on CyberSource tokenization)
- [x] CyberSource: XCD outlet ID and terminal ID set up by the rep; first full test payment through Servly worked (2026-11-10)
- [ ] Decide how merchants pay in the store apps (options in docs/STORE-BILLING.md, 2026-11-09): website-only payment is likely to be rejected by Apple and Google; the app's Pay button must change before submitting. Owner leaning to option 1 (website + Apple/Google billing), final decision another day; not built yet
- [x] Password-reset email through Resend works: test arrived 2026-11-09, from "Servly AG" <noreply@servlyag.com>, signed by servlyag.com, encrypted, landed in the inbox (not spam)
- [ ] CyberSource: allow saving cards (Payment Tokenization) on the Servly Test profile; then add Supabase secret CYBS_SAVE_CARD = yes
- [x] Email provider (SMTP): Resend, sending as Servly AG <noreply@servlyag.com>; password reset tested end to end (2026-11-02)
- [ ] Before launch, Supabase > Authentication: change **Site URL** to `https://servlyag.com` (now `http://localhost:8081`) and raise the **email rate limit** (Rate Limits)
- [ ] Supabase paid plan (free projects pause after about a week with no activity)
- [ ] Lawyer review of Privacy Policy, Terms, Refund Policy (`src/lib/legal.ts`, still DRAFT).
  Asked the lawyer about the consultation fee (2026-11-06): **$409** (EC or US dollars: please confirm)
- [ ] Check Apple and Google rules on charging merchants outside their billing
- [ ] Show the support email (servlyag5@gmail.com) on servlyag.com
- [ ] Point servlyag.com at the Netlify site and make it public. Owner's decision 2026-11-06: NOT yet;
  only when going back to the bank (ACB needs it live for its review)
- [x] Launch date: **7 January 2027** (owner's decision 2026-11-12)

---

## Stage 3: Get ready for the stores

- [x] Expo project linked (EAS project id) (2026-10-28)
- [ ] Supabase keys added to EAS: preview done (checked 2026-11-11); production still to add before a store build
- [x] Android test build installed and checked on a real phone (2026-11-11, push works)
- [x] Push notifications tested on the real build: Android test push received (2026-11-11; Firebase + FCM V1 set up). iPhone needs the Apple Developer account
- [ ] Apple Developer account (US$99/year) and Google Play account (US$25 once)
- [ ] Store listings: screenshots, description, privacy page link, support link
- [ ] Netlify site switched from Private to Public (just before store submission)
- [ ] Submit Android build · [ ] Submit iPhone build

---

## Stage 4: Launch week

- [ ] Sign up Founding Merchants and start their free trials (Admin > Merchants)
- [ ] Switch on LAUNCH50 on launch day (Admin > Promos); LAUNCH50B when it runs out
- [ ] Social media launch posts
- [ ] Remove or hide the demo businesses, and reset the owner test account (yonnie J photo media events: Business until 24 Nov 2027 from 2026-10-24 "Owner testing", then Growth; test payments)

---

## Stage 5: Running the business (after launch)

Every day the brief checks: new merchants, plans paid and money in, trials ending, plans ending,
open support tickets, open reports, promo places left.

- [ ] Jobs board (after launch, in a normal app update; plan in CLAUDE.md)
- [ ] One Home row per category (on hold)

---

## Notes and decisions log

Short dated notes the brief should know about (decisions, things you are waiting on, who you spoke to).

- 2026-10-27: Bundle id `com.servlyag.app` decided. Never change after the first store upload.
- 2026-11-02: Daily brief assistant set up; runs every morning at 7:45 (while the Claude app is open). Backed up to GitHub.
- 2026-11-02: Database confirmed up to date (v25). Payment provider: owner will go to ACB, after
  registering the business at the Intellectual Property office and Inland Revenue (aiming for this week).
  Launch date: 15 December 2026 or 7 January 2027.
- 2026-11-02: Email set up with Resend (domain servlyag.com verified, DNS at GoDaddy). Supabase custom SMTP on.
  Redirect URLs: localhost 8081/8082/8083 + 127.0.0.1:8081, servlyag://reset-password, exp://**; add the
  three website ones (servlyag.com, www, Netlify) if not done. Password reset tested and works.
- 2026-11-06: Business registered. Visited ACB: payments via ACB + CyberSource; 75 USD/month + 4% per
  payment, taken at month end. ACB sent a website checklist and developer links (docs/ACB-REQUIREMENTS.md).
  The bank needs servlyag.com live and public for its review (earlier plan: Private until store submission).
- 2026-11-06 (later): The bank is **ACB (Antigua Commercial Bank)**, not ECAB (ECAB doesn't offer this
  service; earlier notes corrected). Inland Revenue: not registered yet. Lawyer: asked about the
  consultation fee. Address: Old Road Village, St. Mary's Parish, Antigua. Support email:
  servlyag5@gmail.com. Support phone: waiting for a separate business number. servlyag.com stays private
  until the owner goes back to the bank. Owner running v30 today.
- 2026-11-06 (later): Address corrected to **Old Road Village**, St. Mary's Parish. Lawyer consultation
  fee: $409. v30 run and checked. New printouts for the lawyer and ACB made (docs/print).
- 2026-11-06: Search decision: Business plan first, and everyone in a plan takes turns at the front,
  rotating every 30 minutes; drop-down = 2 spots top plan + 1 spot shared by the other plans. Built as
  v31 (supabase/upgrade-v31-fair-turns.sql), tested on a practice database. Owner to run it in Supabase.
- 2026-11-07: Daily check shows v31 (fair turns) installed. Never re-run v30 or older search files after it.
- 2026-11-07: CyberSource support: test account still in initial setup; they are doing ownership validation
  and will tell the owner the next steps. Waiting on CyberSource support (since 2026-11-07).
- 2026-11-07: With the CyberSource rep: test profile "Servly Test" set up, keys generated, return/notification
  addresses entered, asked for both payment and recurring billing notifications. Waiting on the rep.
- 2026-11-07: CyberSource confirmed the test profile is active, Secure Acceptance works, and Token Management,
  Recurring Billing and XCD are available in the sandbox. Next: webhook signature key now; the webhook
  subscription once the notification function is reachable.
- 2026-11-10: CyberSource support case **002799226** (reply to the case follow-up). Endpoint confirmed online; owner
  replying to ask for: webhook subscriptions + delivery test, XCD outlet/terminal IDs (reason 150), saving cards. Waiting on CyberSource.
- 2026-11-10: First full test card payment worked (Growth + bookings, 125.00 XCD, paid). Fixes: XCD outlet/terminal IDs (rep),
  Transaction Response Page = Hosted By You -> payment-return, Merchant POST -> payment-webhook (after CyberSource domain
  validation). Still waiting on case 002799226: saving cards (session timeout) and webhook subscriptions + delivery test.
- 2026-11-10: Saving cards fails with reason 102 "This account is not enabled for tokenization" (asked CyberSource on case 002799226).
  Automatic monthly charges BUILT (database v33, not yet run or tested; owner's rules: charge on the end date, retry 3 days with
  listings visible, merchants switch auto-pay off on Account). Waiting on tokenization; steps in docs/CYBERSOURCE-SETUP.md.
- 2026-11-11: New Android test build installed; push notifications work. Microphone and camera permissions removed.
  Promotional notifications (Christmas offers opening a search) left for AFTER launch, in a normal update.
- 2026-11-11: Daily check shows v33 (automatic monthly payments) installed. Ticked the Supabase secrets and test-payment
  items (the 2026-11-10 test payment proves them). Still waiting on CyberSource case 002799226 for saving cards.
- 2026-11-12: Tokenization still refused (reason 102) on two new tries at 02:07 UTC; owner replying on case 002799226 with the new references. CYBS_SAVE_CARD back to no.
- 2026-11-12: Built: deleting a listing (v35), two notification sounds + pop-up (v34, sounds need a new build), and public Pricing and Contact pages plus Delivery, Exchanges and card-security wording for ACB's website review (needs a new dist upload). Still for ACB: business phone number, official Visa/Mastercard logos (ask ACB), confirm Mastercard is accepted.
- 2026-11-12: Tested on the new build: pop-up notifications, deleting a listing, password reset from the email link (fixed: the app now catches the link; Supabase Redirect URLs include servlyag://**). Over-the-air updates work (expo-updates, preview channel). v36 run: reviews stay when their writer deletes their account shown as "Customer" (owner's choice).
- 2026-11-12: Both notification sounds confirmed on the phone (Sound 1 messages, Sound 2 updates). Over-the-air update delivered "Customer" on reviews. New website build (Pricing, Contact, ACB wording) uploaded to Netlify; servlyag.com itself still to be pointed at it and made public.
