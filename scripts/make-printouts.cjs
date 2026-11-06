// Makes the printable PDFs in docs/print: the lawyer pack (draft legal pages, new wording ACB needs,
// questions) and the follow-up questions for ACB (Antigua Commercial Bank).
// Run with: node scripts/make-printouts.cjs   (needs Microsoft Edge, which turns the pages into PDFs)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const app = path.join(__dirname, '..');
const out = path.join(app, 'docs', 'print');
const ts = require(path.join(app, 'node_modules', 'typescript'));

// Load src/lib/legal.ts without React Native: swap its receipt import for the SELLER line from receipt.ts.
const receipt = fs.readFileSync(path.join(app, 'src/lib/receipt.ts'), 'utf8');
const sellerLine = receipt.split(/\r?\n/).find((l) => l.startsWith('export const SELLER'));
let legalSrc = fs.readFileSync(path.join(app, 'src/lib/legal.ts'), 'utf8');
legalSrc = legalSrc.replace(/^import \{ SELLER \} from '.\/receipt';/m, sellerLine.replace('export ', ''));
const js = ts.transpileModule(legalSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'require', js)(mod, mod.exports, require);
const { PRIVACY, TERMS, REFUNDS, LEGAL_UPDATED } = mod.exports;
const SELLER = new Function('return (' + sellerLine.replace(/^export const SELLER = /, '').replace(/;\s*$/, '') + ')')();

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const LAUNCH = '15 December 2026 or 7 January 2027';
const PHONE = 'business number to come';

const css = `
@page { size: Letter; margin: 0.75in 0.8in; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, sans-serif; color: #14212B; font-size: 11pt; line-height: 1.45; margin: 0; }
.ribbon { height: 5px; background: linear-gradient(90deg, #0072C6 0 38%, #fff 38% 42%, #CE1126 42% 46%, #111 46% 48.5%, #FCD116 48.5% 51.5%, #111 51.5% 54%, #CE1126 54% 58%, #fff 58% 62%, #0072C6 62% 100%); -webkit-print-color-adjust: exact; print-color-adjust: exact; margin-bottom: 18px; }
h1 { font-family: Georgia, serif; color: #0B3A63; font-size: 22pt; margin: 0 0 4px; }
h2 { font-family: Georgia, serif; color: #0072C6; font-size: 15pt; margin: 26px 0 8px; border-bottom: 1.5px solid #0072C6; padding-bottom: 3px; page-break-after: avoid; }
h3 { font-size: 11.5pt; margin: 16px 0 4px; color: #0B3A63; page-break-after: avoid; }
.muted { color: #5a6670; font-size: 10pt; }
.box { border: 1px solid #c9d3db; border-left: 4px solid #FCD116; padding: 10px 14px; margin: 14px 0; background: #FAFAF7; -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-inside: avoid; }
.draft { display: inline-block; border: 1.5px solid #CE1126; color: #CE1126; font-weight: 700; font-size: 9pt; padding: 1px 8px; border-radius: 3px; letter-spacing: .5px; }
ol.q { padding-left: 22px; }
ol.q > li { margin: 0 0 12px; page-break-inside: avoid; }
ol.q > li b { color: #0B3A63; }
.why { color: #5a6670; font-size: 10pt; display: block; margin-top: 2px; }
.lines { margin-top: 6px; }
.lines div { border-bottom: 1px solid #b8c2ca; height: 22px; }
.para { margin: 0 0 6px; }
.pnum { color: #0072C6; font-weight: 700; font-size: 9.5pt; margin-right: 6px; }
.page { page-break-before: always; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; }
tr { page-break-inside: avoid; }
td, th { border: 1px solid #c9d3db; padding: 5px 8px; text-align: left; vertical-align: top; font-size: 10.5pt; }
th { background: #EEF4FA; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.ok { color: #1a7f37; font-weight: 700; } .no { color: #CE1126; font-weight: 700; } .part { color: #9a6700; font-weight: 700; }
.check { font-family: 'Segoe UI Symbol', sans-serif; margin-right: 6px; }
`;
const lines = (n) => `<div class="lines">${'<div></div>'.repeat(n)}</div>`;
const doc = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
const questions = (items) => `<ol class="q">${items.map(([q, why, n = 3]) =>
  `<li><b>${esc(q)}</b>${why ? `<span class="why">${esc(why)}</span>` : ''}${lines(n)}</li>`).join('')}</ol>`;
const contact = `${esc(SELLER.name)} · ${esc(SELLER.address)} · ${esc(SELLER.email)} · Phone: ${PHONE}`;

// New wording ACB asks to see on the website. Drafts for the lawyer to correct; not on the website yet.
const NEW_WORDING = [
  ['Delivery Policy', [
    'Servly AG sells online subscription plans for businesses. Nothing is shipped or delivered by post.',
    'A plan starts as soon as the payment is confirmed, usually within minutes. The merchant can see it on their Account page, with a receipt.',
    `If a plan has not started within 24 hours of a successful payment, contact us at ${SELLER.email} and we will fix it or refund the payment.`,
  ]],
  ['Exchange and Cancellation', [
    'Plans cannot be exchanged for money or for other goods or services.',
    'A merchant can move to a bigger plan at any time (it starts straight away), or to a smaller plan (it starts when the paid month ends).',
    'A merchant can cancel at any time through Contact support or by email. The plan keeps working until the end of the month already paid for. Refunds follow the Refund and Cancellation Policy.',
  ]],
  ['Payment Security', [
    'Card payments are processed by Antigua Commercial Bank (ACB) using CyberSource, a Visa company.',
    'Card details are typed on CyberSource\'s secure payment page and sent over an encrypted (HTTPS) connection.',
    'Servly AG never sees or stores the full card number or the security code. We keep only the amount, date, plan and payment reference, for receipts and our accounts.',
  ]],
  ['Cards and Currency', [
    'We accept Visa and Mastercard.',
    'All prices are in Eastern Caribbean dollars (XCD), and cards are charged in XCD.',
  ]],
  ['Legal and Export Restrictions', [
    'Servly AG plans are for businesses and people offering services in Antigua and Barbuda. Merchants must hold any licence or permit their service needs.',
    'Servly AG sells digital subscriptions only. No physical goods are sold or exported.',
    'We may refuse or remove listings for services that are illegal in Antigua and Barbuda.',
  ]],
];

// ---------- Lawyer pack ----------
const legalSection = (title, path_, sections, letter, note = '') => `
<div class="page"></div>
<div class="ribbon"></div>
<h1>${esc(title)} <span class="draft">DRAFT</span></h1>
<div class="muted">${path_ ? `Shown at servlyag.com${path_} and in the app · Last updated: ${esc(LEGAL_UPDATED)}` : esc(note)}</div>
${sections.map((s, i) => `<h3>${letter}${i + 1}. ${esc(s.heading)}</h3>${s.body.map((p, j) =>
  `<p class="para"><span class="pnum">${letter}${i + 1}.${j + 1}</span>${esc(p)}</p>`).join('')}`).join('')}
<div class="box"><b>Lawyer's notes on this document</b>${lines(6)}</div>`;

const lawyerQs = [
  ['Whose name and address go on these pages?', `The drafts now use "${SELLER.name}", ${SELLER.address}. The business is registered. Should the pages use the exact registered name, and a registration number?`],
  ['Sole trader or company?', 'Which structure suits an online marketplace that charges monthly subscriptions, and does it change how these pages are written?'],
  ['Do the pages meet Antigua and Barbuda\'s data protection law?', 'Data is stored with Supabase (servers outside Antigua). Emails go through Resend, notifications through Expo, and card payments through ACB and CyberSource. Is the Privacy Policy (P1-P' + PRIVACY.length + ') enough, and do we need a named contact person for data requests?'],
  ['Is "not a party to agreements between customers and merchants" enough protection?', 'Servly only connects customers with independent businesses (see the Terms, "What Servly is" and "Liability"). Should merchants agree to anything more, for example a separate merchant agreement, or confirm they hold licences or insurance?'],
  ['Are automatic monthly renewal and "no refund once a month has started" allowed?', 'Refund Policy R2-R4 and Terms T4. Is anything required by consumer law (notice before renewal, cooling-off period, how cancellation must work)? Does it fit the card rules ACB works under (disputed payments / chargebacks)?'],
  ['Do the Terms need to cover free trials and launch promo codes?', 'Free trials for Founding Merchants (usually 90 days) and the LAUNCH50 code (50% off the plan for the first 2 months, 25 merchants). These are not in the drafts yet.'],
  ['Sales tax (ABST) on plan prices', 'Plans are 50 / 100 / 170 XCD per month, plus 25 XCD for the bookings upgrade. Must prices include ABST or show it separately, and on receipts? Registration with Inland Revenue is still to be done.'],
  ['Please check the new wording the bank (ACB) asks for', 'ACB needs a Delivery Policy, Exchange and Cancellation wording, a Payment Security statement, card and currency wording, and Legal and Export Restrictions on the website. Drafts are on the pages marked N1-N' + NEW_WORDING.length + '.'],
  ['Using the Visa and Mastercard logos', 'ACB asks for the card logos on the website. Is there anything legal to watch for beyond following the card brands\' own logo rules?'],
  ['Is a minimum age of 16 right?', 'Privacy P8 and Terms T3.'],
  ['Reviews and removing content', 'Customers post star ratings and comments; merchants can reply. Are we protected if a review is false or hurtful (defamation), and is our right to remove reviews and close accounts worded well (T6-T8)?'],
  ['How long must we keep payment records?', 'When an account is deleted, payment records are kept without the name (P5). How many years does the law require?'],
  ['Protecting the name and logo', 'Should "Servly AG", the tagline "Whatever you need, someone\'s ready." and the blue map-pin logo be registered as trademarks?'],
  ['Customers outside Antigua later', 'We plan to grow to the wider Caribbean. Is "governed by the laws of Antigua and Barbuda" enough, or will each country need changes?'],
];

const lawyer = doc('Servly AG - legal pages for lawyer review', `
<div class="ribbon"></div>
<h1>Servly AG: legal pages for review</h1>
<div class="muted">Prepared ${today} · Draft text last updated ${esc(LEGAL_UPDATED)}<br>${contact}</div>

<div class="box">
<b>What Servly AG is.</b> A marketplace app (Android, iPhone and website, servlyag.com) where local businesses
in Antigua and Barbuda list their services (photographers, hairdressers, tutors, bus services and more) and
customers find them, message them, call them, review them, and (for some businesses) book appointments.
Customers use it free. Businesses ("merchants") pay Servly a monthly plan:
Starter 50 XCD, Growth 100 XCD, Business 170 XCD, with an optional 25 XCD bookings upgrade.
Merchants will pay online through <b>Antigua Commercial Bank (ACB)</b>, on CyberSource's secure payment page.
Servly never takes payment for the merchants' own services. Planned launch: ${LAUNCH}.
</div>

<h2>What I need from you</h2>
<p>Please review the three draft documents (Privacy Policy, Terms of Service, Refund and Cancellation
Policy) and the new wording the bank asks for, mark any changes on the pages, and help with the questions
below. Every paragraph is numbered (for example <b>T4.1</b> = Terms, section 4, paragraph 1).</p>

<table>
<tr><th>Document</th><th>Numbering</th><th>Shown at</th></tr>
<tr><td>Privacy Policy</td><td>P1 - P${PRIVACY.length}</td><td>servlyag.com/privacy and in the app</td></tr>
<tr><td>Terms of Service</td><td>T1 - T${TERMS.length}</td><td>servlyag.com/terms and in the app (agreed at sign-up)</td></tr>
<tr><td>Refund and Cancellation Policy</td><td>R1 - R${REFUNDS.length}</td><td>servlyag.com/refunds, the Plan screen and Checkout</td></tr>
<tr><td>New wording for the bank (ACB)</td><td>N1 - N${NEW_WORDING.length}</td><td>Not on the website yet: Delivery, Exchange and Cancellation, Payment Security, Cards and Currency, Legal and Export Restrictions</td></tr>
</table>

<h2>Questions for the lawyer</h2>
${questions(lawyerQs)}

<div class="box"><b>Other notes, fees and next steps</b>${lines(6)}</div>

${legalSection('Privacy Policy', '/privacy', PRIVACY, 'P')}
${legalSection('Terms of Service', '/terms', TERMS, 'T')}
${legalSection('Refund and Cancellation Policy', '/refunds', REFUNDS, 'R')}
${legalSection('New wording for the bank (ACB)', '', NEW_WORDING.map(([heading, body]) => ({ heading, body })), 'N',
  'ACB asks for these on the website before it approves online payments. Drafts for your corrections; not published yet.')}
`);

// ---------- ACB follow-up questions ----------
const status = (s) => ({ ok: '<span class="ok">Done</span>', part: '<span class="part">Partly</span>', no: '<span class="no">To do</span>' })[s];
const checklist = [
  ['Website live (not inactive, parked or forwarded)', 'no', 'servlyag.com goes live when we are ready for your review.'],
  ['Business name and physical address, country at checkout', 'part', `${SELLER.address}. Being added to the website footer and Checkout.`],
  ['Support email and telephone', 'part', `${SELLER.email}. Business phone number to come.`],
  ['Terms and Conditions', 'part', 'Written (draft), with our lawyer for review.'],
  ['Return / Refund policy', 'part', 'Written (draft), with our lawyer.'],
  ['Exchange / Cancellation policy', 'part', 'Cancellation written; exchange wording with our lawyer.'],
  ['Delivery policy', 'part', 'Drafted (digital service, nothing shipped), with our lawyer.'],
  ['Privacy policy', 'part', 'Written (draft), with our lawyer.'],
  ['Card brand marks (Visa, Mastercard)', 'no', 'Will add once we have the official logos.'],
  ['Complete description of services', 'part', 'Public plans and prices page being built.'],
  ['Transaction currency', 'ok', 'Eastern Caribbean dollars (XCD), shown at Checkout.'],
  ['Legal and export restrictions', 'part', 'Drafted, with our lawyer.'],
  ['Security policy for card details', 'part', 'Drafted: card details typed only on CyberSource\'s page; Servly never stores them.'],
];

const acbQs = [
  ['Can our CyberSource account charge in Eastern Caribbean dollars (XCD)?', 'All our prices are in XCD.'],
  ['Are monthly automatic charges included?', 'Ask for "Recurring Billing" and "Token Management" (saved cards). Our merchants pay every month.'],
  ['Which payment page should we use?', 'Ask: "Unified Checkout" or "Secure Acceptance hosted checkout"? Either way, cards are typed on CyberSource\'s page, not ours.'],
  ['Can CyberSource tell our system automatically when someone pays?', 'Ask for "webhooks" to be switched on for our account, for payments and recurring billing.'],
  ['Do you give us test (sandbox) logins, or should our developer sign up for one?', 'We want to test with pretend cards before going live.'],
  ['When does the 75 USD monthly fee start?', 'At sign-up, at approval, or from our first payment? Our first merchants will be on free trials.', 2],
  ['Is there a setup fee, a minimum contract, or a fee to leave?', '', 2],
  ['What do refunds and disputed payments (chargebacks) cost?', '', 2],
  ['The 75 USD fee: is it taken from an XCD account, and at what exchange rate?', '', 2],
  ['How many days until payments reach our account?', '', 2],
  ['Can you send the official Visa and Mastercard logos to use?', ''],
  ['Who reviews our website, and how long does approval take?', `We plan to launch on ${LAUNCH}.`],
  ['Can we have the merchant agreement and the fee list in writing?', ''],
];

const acb = doc('Servly AG - follow-up questions for ACB', `
<div class="ribbon"></div>
<h1>Follow-up questions for ACB</h1>
<div class="muted">Antigua Commercial Bank · online card payments (CyberSource) · Prepared ${today}<br>${contact} · servlyag.com</div>

<div class="box">
<b>What we understood from you.</b> Servly AG will take card payments online through ACB, using CyberSource.
Fees: <b>75 USD per month</b> plus <b>4% of every settlement</b>, taken automatically at the end of each month.
Your website requirements and the CyberSource developer guides have been passed to our developer.
<br><br><b>About Servly AG.</b> A marketplace app and website where local businesses list their services and
customers find them. Customers use it free. Businesses pay Servly a monthly plan: Starter 50 XCD, Growth 100 XCD,
Business 170 XCD, plus an optional 25 XCD bookings upgrade. Payments are taken on the website.
</div>

<h2>Questions</h2>
${questions(acbQs)}

<h2>Your website checklist: where we are</h2>
<table>
<tr><th>You asked for</th><th>Status</th><th>Notes</th></tr>
${checklist.map(([what, s, note]) => `<tr><td>${esc(what)}</td><td>${status(s)}</td><td>${esc(note)}</td></tr>`).join('')}
</table>

<div class="box"><b>Who I spoke to, contact details, and next steps</b>${lines(6)}</div>
`);

// ---------- Write and print ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'servly-print-'));
const edge = ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));
if (!edge) throw new Error('Microsoft Edge not found; it is needed to make the PDFs.');
fs.mkdirSync(out, { recursive: true });
// Dated names, so a new printout never gets mixed up with an older one (or blocked by one left open).
const stamp = new Date().toISOString().slice(0, 10);
for (const [name, html] of [[`Servly-AG-legal-pages-for-lawyer-${stamp}`, lawyer], [`Servly-AG-questions-for-ACB-${stamp}`, acb]]) {
  const file = path.join(tmp, name + '.html');
  const pdf = path.join(out, name + '.pdf');
  fs.writeFileSync(file, html);
  try { fs.rmSync(pdf, { force: true }); } catch { throw new Error(`Close ${name}.pdf (it is open in another program) and run this again.`); }
  execFileSync(edge, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--user-data-dir=${path.join(tmp, 'edge-' + name)}`,
    `--print-to-pdf=${pdf}`, 'file:///' + file.replace(/\\/g, '/')], { stdio: 'ignore' });
  // Edge can hand the job to a helper process and return early, so wait (up to a minute) for the file.
  const until = Date.now() + 60000;
  while (!(fs.existsSync(pdf) && fs.statSync(pdf).size > 0) && Date.now() < until) execFileSync(process.execPath, ['-e', 'setTimeout(()=>{},500)']);
  console.log(fs.existsSync(pdf) ? 'Made' : 'FAILED to make', path.join('docs', 'print', name + '.pdf'));
}
fs.writeFileSync(path.join(tmp, 'preview-acb.html'), acb); // kept for a quick look; the temp folder is not in the project
console.log('Preview HTML in', tmp);
