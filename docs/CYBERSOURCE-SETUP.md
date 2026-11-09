# CyberSource test account: setup steps

The test account ("sandbox") uses pretend cards and no real money. Everything here is for testing; when ACB
approves Servly, the bank gives the real (live) account and we swap the keys. Started 2026-11-06.

**Never paste a secret key into a chat, an email, the app or GitHub.** Keep it in a password manager until
it goes into Supabase's secret storage (step 5).

## Plan (recommended, final choice after ACB answers)

**Secure Acceptance Hosted Checkout**: Servly sends the merchant to CyberSource's own payment page; they type
their card there; CyberSource sends them back to Servly and tells our server the result. The first payment
also saves the card safely as a "token" and sets up the **monthly** charge (CyberSource recurring billing:
`sale,create_payment_token` with `recurring_frequency=monthly`). Works on the website and from the phone apps
(opens in the browser). Servly never sees card numbers.

## Your steps (owner)

1. **Done:** sandbox account created (2026-11-06).
2. **Done:** Organization ID (test merchant ID): **servlyag_1793983604** (2026-11-06). Not secret.
3. **Create a REST API key:** Payment Configuration > Key Management > Generate new key > choose
   **REST - Shared Secret**. Save the **Key ID** and the **Shared Secret** in your password manager. The
   secret may only be shown once.
4. **Ask CyberSource support to switch on** (asked 2026-11-07; they are validating ownership first), for your test merchant ID:
   - Secure Acceptance (Hosted Checkout)
   - Token Management Service (TMS: saved cards)
   - Recurring Billing (monthly charges)
   The docs say each of these must be enabled by CyberSource before it works. (Ask ACB to do the same on the
   live account; it's on the ACB questions sheet.)
5. **Create a Secure Acceptance profile** (after step 4 is done): Payment Configuration > Secure Acceptance
   Settings > New Profile. Profile name "Servly AG", integration method **Hosted Checkout**, company
   "Servly AG", your email, and tick **Payment Tokenization**. Claude will give you the two web addresses to
   fill in (the page merchants return to, and the address CyberSource notifies). Then **activate** the profile.
   It gives a **Profile ID**, an **Access Key** and a **Secret Key**: password manager, never chat.
6. **Put the secrets into Supabase** yourself: Supabase > Edge Functions > Secrets > Add new secret.
   Claude will give you the exact names to use.

### Web addresses for the test profile "Servly Test" (2026-11-07)

Both are Supabase server functions, not website pages, because CyberSource sends the result as a form POST
that a plain website page (Netlify) can't receive or check. The return function checks the signature, then
sends the merchant on to the app.

- **Customer Response > Transaction Response Page** (Hosted by you / custom redirect) and **Custom Cancel
  Response Page**: `https://uaeatlkrfbznabybawdi.supabase.co/functions/v1/payment-return`
- **Notifications > Merchant POST URL**: `https://uaeatlkrfbznabybawdi.supabase.co/functions/v1/payment-webhook`

They don't work yet (Claude builds them next); saving the profile with them is fine.

Notifications asked for (told the CyberSource rep 2026-11-07): **both** payment notifications and recurring
billing notifications, to the payment-webhook address above. Recurring ones are what add a month for each
monthly charge (and flag a failed charge).

**Done 2026-11-07:** the rep set up the test profile "Servly Test"; the owner generated its keys (Key name
"Servly Test Key", HMAC-SHA256) and saved them in the password manager.

### Supabase secret names (Supabase > Edge Functions > Secrets > Add new secret)

| Name | What goes in it |
|---|---|
| `CYBS_MERCHANT_ID` | servlyag_1793983604 |
| `CYBS_PROFILE_ID` | the profile's Profile ID |
| `CYBS_ACCESS_KEY` | the profile's Access Key |
| `CYBS_SECRET_KEY` | the profile's Secret Key |
| `CYBS_ENV` | `test` (changes to `live` when ACB gives the live account) |

Later: `CYBS_REST_KEY_ID` and `CYBS_REST_SECRET` (REST key), and the webhook digital signature key:
`CYBS_WEBHOOK_KEY_ID` (its key ID) and `CYBS_WEBHOOK_SECRET` (the key itself).

**Confirmed by CyberSource 2026-11-07:** test profile active, Secure Acceptance configured, Token Management,
Recurring Billing and XCD available in the sandbox. Webhooks: the digital signature key is made first; the
subscription (payment + recurring billing events) is finished with the rep once payment-webhook is live.

## Built 2026-11-07: first payments (not yet deployed or tested with CyberSource)

How a payment works now:
1. Checkout > **Pay**: the app asks the `payment-start` function, which works out the price itself (plan
   - promo + bookings upgrade, the same sum as `activate_plan`) and saves a **payment order** (database v32).
2. The website's `/pay` page gets the signed form from `payment-start` and sends the merchant to
   CyberSource's card page (test: testsecureacceptance.cybersource.com). Phones open `/pay` in the browser.
3. CyberSource sends the merchant back to `payment-return` and also tells `payment-webhook`. Both check the
   signature; the first to arrive marks the order paid and runs `activate_plan` (month added, receipt made)
   and saves the card as a token (`billing_cards`). Then the merchant lands on `/payment-result`.

Files: `supabase/functions/payment-start`, `payment-return`, `payment-webhook`, `_shared/`;
`src/app/pay.tsx`, `src/app/payment-result.tsx`, Checkout's Pay button; `supabase/upgrade-v32-card-payments.sql`;
tests `__tests__/cybersource.test.ts`. Login check is off for the three functions in `supabase/config.toml`
(each checks for itself).

**Found 2026-11-08 ("session timeout"):** a payment that also asks to save the card
(`sale,create_payment_token`) is sent to CyberSource's error page, which browsers show as "session timeout";
a plain `sale` opens the card page. So saving the card is OFF for now. To switch it on: in the test Business
Center, open the Servly Test profile and tick **Payment Tokenization** (General Settings), save and activate
the profile again (or ask the rep why tokens are refused); then add the Supabase secret `CYBS_SAVE_CARD` = `yes`.
Without saved cards, each month is paid by the merchant pressing Pay.

**Test payments, 2026-11-08:** reason 101 (missing bill_address1, bill_city, bill_country, customer_lastname)
was fixed in the profile: Payment Form > Billing Information **Enabled**, and First/Last name, Street Address 1,
City, Country ticked Display + **Edit** + **Require**; Single Page Form. Next attempt: reason **150**, processor
`fdiglobal`, "invalid or missing: **xcd_outlet_id, xcd_terminal_id**": the processor has no outlet/terminal
IDs set up for XCD. That is a CyberSource/ACB account setting (asked of the rep), not Servly code.

Not built yet: **the monthly charges** (charging the saved token each month, using the REST key) and acting
on Recurring Billing webhooks (they are only checked and logged for now).

### Owner: switching it on for testing (in this order)

1. Supabase > SQL Editor: run `supabase/upgrade-v32-card-payments.sql`.
2. Supabase > Edge Functions > Secrets: add `CYBS_ACCESS_KEY`, `CYBS_PROFILE_ID`, `CYBS_SECRET_KEY`,
   `CYBS_ENV` = `test`, `CYBS_WEBHOOK_SECRET` (the webhook key), `CYBS_WEBHOOK_KEY_ID` (its key ID), and
   `APP_URL` = where merchants land after paying. For testing on your own computer: `http://localhost:8090`;
   later the website (`https://servlyag.com`).
3. Put the functions online (Terminal panel; the login opens your browser, where you sign in yourself):
   `npx supabase login`, then `npx supabase link --project-ref uaeatlkrfbznabybawdi`, then
   `npx supabase functions deploy`.
4. In `.env`: `EXPO_PUBLIC_PAY_URL=http://localhost:8090/pay` for testing (later `https://servlyag.com/pay`).
   Restart the app.
5. Test: Plan > choose a plan > Checkout > Pay > card 4111 1111 1111 1111, any future expiry, any 3-digit
   code. Then tell the CyberSource rep the endpoint is live, so they can finish the webhook subscriptions.

## Claude's steps (developer)

- Build a small server function that prepares a signed payment request (so the price can't be changed by anyone).
- Build the "return" page and the notification handler (adapting `supabase/functions/payment-webhook`), which
  checks the signature and then switches the plan on with `activate_plan`.
- Monthly charges: link each CyberSource subscription to the merchant, so every monthly payment adds a month.
- Test end to end with CyberSource's test cards (e.g. Visa 4111 1111 1111 1111, any future date).

## Sources

- Sandbox: https://developer.cybersource.com/hello-world/sandbox.html
- Secure Acceptance profile: https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-configuration/sa-both-intro-create-sa-profile.html
- Recurring payments: https://developer.cybersource.com/docs/cybs/en-us/sa/developer/all/sa-hosted/secure-acceptance/sa-payment-txns/sa-recurring-payments.html
- Keys: https://developer.cybersource.com/docs/cybs/en-us/security-keys/user/all/ada/security-keys/keys-manage.html
