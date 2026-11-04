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
- [ ] Deleting a listing
- [ ] Payment connection + webhook that activates plans (needs a provider first, see Stage 2)
- [ ] Settings screen
- [ ] Final layouts for the three listing page designs (Starter / Growth / Business are placeholders)

### Database updates run in Supabase
- [x] All updates up to v29 run (v25 on 2026-11-02; v27, v28, v29 owner confirmed 2026-11-03, check passes); `npm run check:db` checks them each day
- [x] You are an admin (`admins` table, OWNER-GUIDE section 1) (owner confirmed 2026-11-02)
- v21 is replaced by v24/v25 (no need to run it)

---

## Stage 2: Things only you can decide or set up

- [ ] **Register the business at the Intellectual Property office** (target: this week, by Fri 6 Nov)
- [ ] **Register with Inland Revenue** (target: this week, by Fri 6 Nov)
- [ ] **Payment provider: go to ECAB** (after the business is registered). Ask them: can Servly charge
  merchants a monthly subscription in XCD online (card payments on a website), what do they need from
  you, what are the fees, can they tell our system automatically when a payment goes through (a
  "webhook"), and how long setup takes. Earlier options looked at: WiPay, First Atlantic Commerce,
  Dodo Payments.
- [x] Email provider (SMTP): Resend, sending as Servly AG <noreply@servlyag.com>; password reset tested end to end (2026-11-02)
- [ ] Before launch, Supabase > Authentication: change **Site URL** to `https://servlyag.com` (now `http://localhost:8081`) and raise the **email rate limit** (Rate Limits)
- [ ] Supabase paid plan (free projects pause after about a week with no activity)
- [ ] Lawyer review of Privacy Policy, Terms, Refund Policy (`src/lib/legal.ts`, still DRAFT)
- [ ] Check Apple and Google rules on charging merchants outside their billing
- [ ] Support email address on servlyag.com
- [ ] Point servlyag.com at the Netlify site
- [ ] Pick the final launch date: 15 December or 7 January

---

## Stage 3: Get ready for the stores

- [x] Expo project linked (EAS project id) (2026-10-28)
- [ ] Supabase keys added to EAS (preview + production), OWNER-GUIDE section 5
- [ ] Android test build installed and checked on a real phone
- [ ] Push notifications tested on the real build
- [ ] Apple Developer account (US$99/year) and Google Play account (US$25 once)
- [ ] Store listings: screenshots, description, privacy page link, support link
- [ ] Netlify site switched from Private to Public (just before store submission)
- [ ] Submit Android build · [ ] Submit iPhone build

---

## Stage 4: Launch week

- [ ] Sign up Founding Merchants and start their free trials (Admin > Merchants)
- [ ] Switch on LAUNCH50 on launch day (Admin > Promos); LAUNCH50B when it runs out
- [ ] Social media launch posts
- [ ] Remove or hide the demo businesses

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
- 2026-11-02: Database confirmed up to date (v25). Payment provider: owner will go to ECAB, after
  registering the business at the Intellectual Property office and Inland Revenue (aiming for this week).
  Launch date: 15 December 2026 or 7 January 2027.
- 2026-11-02: Email set up with Resend (domain servlyag.com verified, DNS at GoDaddy). Supabase custom SMTP on.
  Redirect URLs: localhost 8081/8082/8083 + 127.0.0.1:8081, servlyag://reset-password, exp://**; add the
  three website ones (servlyag.com, www, Netlify) if not done. Password reset tested and works.
