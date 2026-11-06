# ACB (Antigua Commercial Bank) online payments: what the bank asked for, and where we stand

Received from ACB on 2026-11-06 after the owner's visit. ACB's online payments run on **CyberSource**
(a Visa company): customers type their card on CyberSource's secure page, the money settles to ACB.

## Fees (from ACB)

- **75 USD per month** to keep the service (about **202.50 XCD**; the EC dollar is fixed at 2.70 per US dollar)
- **4% of every settlement** (every payment that comes in)
- Both are taken automatically at the end of each month.

What that means for Servly (simple sums, not advice):

| Money in per month (XCD) | 4% fee | Monthly fee | Servly keeps |
|---|---|---|---|
| 0 (only free trials) | 0 | 202.50 | **-202.50** |
| 211 (break-even) | 8.44 | 202.50 | 0 |
| 500 (e.g. 10 Starter) | 20.00 | 202.50 | 277.50 |
| 1,510 (10 Starter, 5 Growth, 3 Business) | 60.40 | 202.50 | 1,247.10 |
| 3,000 | 120.00 | 202.50 | 2,677.50 |

Per payment after the 4%: Starter 50 -> 48.00 · Growth 100 -> 96.00 · Business 170 -> 163.20 · Bookings 25 -> 24.00 XCD.
Watch: Founding Merchant free trials (90 days) and LAUNCH50 (half price for 2 months) bring in little money
while the 75 USD is still charged. Ask ACB exactly when the monthly fee starts.

## Website requirements (ACB list) vs servlyag.com today

| ACB needs | Status | What to do |
|---|---|---|
| Website URL live (not inactive, parked or forwarded) | **Missing** | Point servlyag.com at Netlify with DNS records at GoDaddy (not "forwarding"), and make the Netlify site **Public**. Owner's earlier plan was Private until store submission; the bank review needs it public. |
| Business name and physical address, incl. country at checkout | **Partly** | Address given 2026-11-06: Old Road Village, St. Mary's Parish, Antigua (now on receipts and legal pages). Still to show it on a Contact page, in the footer and at Checkout ("Antigua and Barbuda"). |
| Contact: support email and telephone | **Partly** | Email: servlyag5@gmail.com. Phone: owner getting a separate business number. Add a public Contact page. |
| Terms and Conditions | Draft | `/terms` (lawyer review pending) |
| Return/Refund policy | Draft | `/refunds` |
| Exchange/Cancellation policy | Draft | Cancelling is in `/refunds`; add a line that plans can't be exchanged, only changed (upgrade now / move down at month end). |
| Delivery policy | **Missing** | Add: digital service, nothing shipped; plan works as soon as payment is confirmed; receipt in Account. |
| Privacy policy | Draft | `/privacy` |
| Card brand marks (Visa, Mastercard) | **Missing** | Official logos on Checkout and the website footer (follow Visa/Mastercard logo rules; ACB may supply them). |
| Complete description of the services sold | **Missing for visitors** | The Plan screen needs a login. Add a public "Plans and pricing" page (what each plan includes and costs). |
| Transaction currency | OK in Checkout (XCD) | Also state "All prices in Eastern Caribbean dollars (XCD)" on the pricing page and in the Terms. |
| Legal restrictions / export restrictions (if known) | **Missing** | Short statement (e.g. plans are for businesses in Antigua and Barbuda; no export of goods). Ask the lawyer. |
| Security policy for card details | **Missing** | Add: card details are typed on CyberSource's secure page over an encrypted connection; Servly never sees or stores card numbers. |

## For the developer (CyberSource)

Links from ACB:
- Developer guides: https://developer.cybersource.com/api/developer-guides.html
- REST API reference: https://developer.cybersource.com/api-reference-assets/index.html

What was found on those pages (2026-11-06; some guides could not be read):
- **Payment page:** CyberSource's checkout (Unified Checkout, or the older Secure Acceptance hosted page)
  keeps card numbers off Servly's systems, which keeps Servly at the simplest card-security level (PCI "SAQ A").
- **Monthly charges:** CyberSource has Recurring Billing and saved-card tokens (Token Management). Not yet
  confirmed which ones ACB switches on for us.
- **Webhooks:** yes. CyberSource can notify our server (the `payment-webhook` function) for payments and
  Recurring Billing events; each message is signed with a key we create, so we can check it is genuine.
- **Sandbox (test account):** free at developer.cybersource.com/hello-world/sandbox.html, with test cards.
  Sandbox and live keys are separate.
- **Currency:** XCD support was **not confirmed** on the public pages. Must be confirmed by ACB.

## Questions still to ask ACB

1. Is our CyberSource account set up to charge in **XCD**?
2. Are **Recurring Billing** (monthly automatic charges) and **Token Management** (saved cards) included?
3. Which checkout should we use: **Unified Checkout** or **Secure Acceptance hosted checkout**?
4. Are **webhooks** switched on for our account?
5. Do you give us **test (sandbox) credentials**, or should the developer sign up for a sandbox?
6. **When does the 75 USD monthly fee start**: at sign-up, or from the first payment? Any setup fee, minimum
   term, or fee to leave? Fees for refunds and chargebacks?
7. Is the 75 USD taken from an XCD account (what exchange rate)?
8. Will you send the official **Visa/Mastercard logos** to use?
9. Who reviews the website, and how long does approval take?
