# Plan: free trials for Founding Merchants (database v22)

Status: **built 2026-10-31** with the recommended answers to all 4 questions (owner: "Yes, use those"). The owner still has to run `supabase/upgrade-v22-free-trials.sql` in Supabase.

Change from the plan: no `profiles.trial_until` column. Other users can read some profile columns, and a trial date would show who is on a free plan, so the app reads the merchant's own row in `free_trials` instead (`src/lib/trial.ts`).

## The problem
The only way to switch a plan on today is `activate_plan` (Admin > Activate 1 month, and later the payment webhook). It always:
- adds exactly **one month**, and
- writes a row in `payments` for the full price, which shows up as a **receipt** in the merchant's Account and counts as income.

So giving a Founding Merchant 90 days free would create 3 receipts for money they never paid.

## The plan

### Database (new file `supabase/upgrade-v22-free-trials.sql`, same file numbered in `supabase/migrations/`)
1. **New table `free_trials`**: one row per trial, as a record of who got what. Columns: merchant, plan (tier), days, booking on or off, started, ends, who gave it, note (e.g. "Founding Merchant"). Row Level Security on: merchants can read only their own row, nobody can write except through the function below.
2. **New column `profiles.trial_until`**: the end of the free time (empty for merchants who never had a trial). Lets the app say "Free trial until 15 February" instead of "active until".
3. **New function `start_free_trial(merchant, plan, days = 90, booking = false, note)`**, server key only, plus **`admin_start_free_trial(...)`** for the Admin dashboard (admins only, like `admin_activate_plan`). It:
   - refuses if the merchant already had a trial (one per merchant) or currently has paid time;
   - switches the plan on with the existing `apply_plan_change` (same listing limits, search order and booking rules as a paid plan);
   - sets `plan_expires_at` and `trial_until` to today + the number of days;
   - writes a `free_trials` row and **no `payments` row**, so no receipt and no fake income.
4. **Nothing else changes.** When the merchant pays later, `activate_plan` already adds the paid month **after** the free time ends, so nobody loses free days. When the trial ends unpaid, listings hide from customers exactly as they do today when a plan runs out. The existing "Your plan ends soon" push (3 days before) also covers trials.

### App
- **Admin dashboard (`src/app/admin.tsx`)**: a "Start free trial" button next to "Activate 1 month", with the number of days (default 90). Only shown for merchants who never had a trial.
- **Account, Plan screen, PlanBanner**: show "Free trial until <date>" while `trial_until` is in the future.
- **Receipts**: unchanged; trials never appear there.

### Docs and checks
- Update `CLAUDE.md` and `docs/OWNER-GUIDE.md` (how to give a free trial).
- Run `npm run typecheck` and `npm test`; the owner runs the SQL file in Supabase.

## Questions for the owner
1. **Moving down during a trial:** should free time count like paid time (a smaller plan waits until the trial ends, like today's rule for paid time)? *Recommended: yes, it keeps one simple rule.*
2. **One trial per merchant?** *Recommended: yes.*
3. **Booking tool during a Starter or Growth trial:** off unless you tick it, or always off? *Recommended: off unless you tick it.*
4. **Trial length:** always 90 days, or changeable per merchant in the Admin dashboard? *Recommended: changeable, default 90.*

## Not part of this plan
- The 12-month price lock: prices are not changing, so it needs no code now. If prices ever go up, founders' locked prices would need a small change to `activate_plan` then.
- A "Founding Merchant" badge on listings (a separate small change, if wanted).
