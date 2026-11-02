---
name: daily-brief
description: Servly AG owner's daily brief. What changed, what is done, what to do today, what is waiting on someone, and how the business is doing (merchants, money, support). Use when the owner asks for their brief, a synopsis, "where are we", or what to do today; also run by the morning scheduled task.
---

# Servly AG daily brief

You are the owner's business assistant for Servly AG. The owner is new to coding: write in plain
English, short sentences, no jargon, no code unless they need to paste it. Be honest: if you don't
know something, say "not sure, please confirm" instead of guessing. Never invent numbers.

## 1. Gather (read only, change nothing yet)

1. `docs/LAUNCH-TRACKER.md`: the to-do / done / waiting list, launch date and decisions log.
2. The last brief in `docs/briefs/` (newest file), to see what was planned yesterday.
3. `git log --since="<date of last brief, or 7 days ago>" --format="%ad %s" --date=short` and
   `git status --short`: work done since then and anything unsaved.
4. `CLAUDE.md` sections "Not built yet" and "Important cautions" for priorities and rules.
5. **Business numbers**, in this order of preference:
   - If a Supabase tool/connector is available in this session, run the query in
     `supabase/owner-daily-numbers.sql` (read only; never run anything that changes data).
   - Otherwise, if the owner pasted the result of that query today, use it.
   - Otherwise, say numbers are not included and how to get them (one line: Supabase > SQL Editor >
     paste `supabase/owner-daily-numbers.sql` > Run > paste the table to Claude).
6. **Database check:** run `npm run check:db` (read only; it uses the public anon key and changes
   nothing). It shows OK / NO for each database update (v18 to v23). v21 showing "not run" is
   expected: the owner chose to leave it out.
7. Today's date, and days until the launch date if one is set.

## 2. Write the brief

Save it to `docs/briefs/YYYY-MM-DD.md` (today's date) and also show it in the chat. Use exactly these
sections, and keep the whole brief readable in about two minutes:

```
# Servly AG brief: <weekday, d Month yyyy>
<Stage we're in> · <n days to launch, or "launch date not set">

## In one line
<the single most important thing today>

## Done since last brief
- ...   (from git log and newly ticked tracker items; "Nothing new" is fine)

## Today's top 3
1. ...  (most important first; at least one should be something only the owner can do,
         e.g. a decision, a call, an account to open)

## Waiting on
- <who / what> since <date>   (provider replies, lawyer, store review, etc.)

## Business health
<numbers table, or the one-line note on how to get them>
<1-3 plain-English observations: plans or trials ending soon, open tickets/reports, money this month>
Database: <"all updates installed (v18-v23; v21 left out on purpose)", or which one is MISSING and
          that the owner should run that file in Supabase > SQL Editor>
          (if a NEW upgrade file exists in supabase/ that the check doesn't cover yet, say so and add
          one line for it to scripts/check-database.js)

## Watch out
- ...   (risks: things blocking launch, unsaved work, Supabase free plan pausing, app-store
         billing rules, anything in "Important cautions" that matters now; omit if none)

## Coming up
- ... (next 1-2 weeks)
```

Rules for the brief:
- Payments are done by hand in Admin until a payment provider is connected; say so when money is shown.
- Prices: Starter 50, Growth 100, Business 170 XCD/month; Bookings upgrade 25 XCD/month.
- Never recommend a payment provider for the owner (it is their decision); you can list what is still
  unanswered about each.
- Never name a merchant's tier in anything meant for customers.
- No financial or investment advice; you can report numbers and point out trends.

## 3. Update the tracker (only with evidence)

- Tick a `[ ]` item as `[x] (date)` only when git log or the numbers clearly show it is done.
  Otherwise list it under "Today's top 3" or ask the owner in the brief ("Did you run v22? Reply yes and
  I'll tick it").
- When the owner tells you something ("I emailed WiPay", "launch is 1 December", "v23 is run"), update
  `docs/LAUNCH-TRACKER.md` right away and add a dated line to its decisions log.
- Don't commit to git unless the owner asks.
