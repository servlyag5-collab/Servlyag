# Servly AG: launch tracker

The daily brief (`/daily-brief`) reads this file every morning. It is your single list of what is
done, what is next, and what is waiting on someone. Tick a box by changing `[ ]` to `[x]` and adding
the date, or just tell Claude "mark X as done" and it will update it.

Marks: `[x]` done · `[ ]` to do · `[?]` not sure yet (please confirm) · `[~]` waiting on someone else

Launch date: **not set yet**

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
- [?] v22 free trials (`supabase/upgrade-v22-free-trials.sql`)
- [?] v23 promo codes (`supabase/upgrade-v23-promo-codes.sql`)
- [?] You are an admin (`admins` table, OWNER-GUIDE section 1)
- Optional, not run (your choice): v21 search word starts

---

## Stage 2: Things only you can decide or set up

- [~] **Payment provider.** Not chosen. WiPay, First Atlantic Commerce and Dodo Payments were looked at;
  each must confirm an Antigua and Barbuda business can charge a monthly fee in XCD.
- [ ] Email provider (SMTP) so customers get password-reset and confirmation emails
- [ ] Supabase paid plan (free projects pause after about a week with no activity)
- [ ] Lawyer review of Privacy Policy, Terms, Refund Policy (`src/lib/legal.ts`, still DRAFT)
- [ ] Check Apple and Google rules on charging merchants outside their billing
- [ ] Support email address on servlyag.com
- [ ] Point servlyag.com at the Netlify site
- [ ] Set the launch date

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
- 2026-11-02: Daily brief assistant set up.
