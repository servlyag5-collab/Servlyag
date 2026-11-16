// Builds the public "Coming soon" website for servlyag.com into coming-soon/out (not saved to GitHub).
// Run with: npm run build:coming-soon   then drag coming-soon/out onto its own Netlify site (see coming-soon/README.md).
// - index.html: the launch sign-up page (database v38, join_launch_list), using the public anon key from .env.
// - terms/, privacy/, refunds/, pricing/, contact/: made from the same text as the app (src/lib/legal.ts).
// Optional in .env: COMING_SOON_WHATSAPP=2685551234 (the "Message us" button for businesses; email if empty).
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const src = path.join(root, 'coming-soon');
const out = path.join(src, 'out');

const env = {};
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!env.EXPO_PUBLIC_SUPABASE_URL || !env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

// The seller details (src/lib/receipt.ts) and the legal text (src/lib/legal.ts), read without the app around them.
const receiptSrc = fs.readFileSync(path.join(root, 'src/lib/receipt.ts'), 'utf8');
const sellerLiteral = receiptSrc.match(/export const SELLER = (\{[^;]*\});/);
if (!sellerLiteral) throw new Error('SELLER not found in src/lib/receipt.ts');
const SELLER = Function(`return (${sellerLiteral[1]});`)();
const legalJs = ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/legal.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const legal = {};
Function('exports', 'require', legalJs)(legal, (m) => {
  if (m === './receipt') return { SELLER };
  throw new Error(`legal.ts needs ${m}; teach build-coming-soon.js about it`);
});

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fill = (html, vals) => html.replace(/\{\{([A-Z_]+)\}\}/g, (_, k) => {
  if (!(k in vals)) throw new Error(`No value for {{${k}}}`);
  return vals[k];
});

const whatsapp = (env.COMING_SOON_WHATSAPP || '').replace(/\D/g, '');
const wa = whatsapp.length === 7 ? `1268${whatsapp}` : whatsapp;
const common = { ADDRESS: esc(SELLER.address), EMAIL: esc(SELLER.email) };

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

fs.writeFileSync(path.join(out, 'index.html'), fill(fs.readFileSync(path.join(src, 'index.template.html'), 'utf8'), {
  ...common,
  SUPABASE_URL: env.EXPO_PUBLIC_SUPABASE_URL.replace(/\/+$/, ''),
  ANON_KEY: env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  BUSINESS_HREF: wa
    ? `https://wa.me/${wa}?text=${encodeURIComponent("Hi Servly, I'd like to get my business listed.")}`
    : `mailto:${SELLER.email}?subject=${encodeURIComponent('Get my business listed on Servly')}`,
  BUSINESS_TEXT: wa ? 'Message us on WhatsApp' : 'Email us to get listed',
}));

const pages = [
  ['terms', 'Terms of Service', legal.TERMS],
  ['privacy', 'Privacy Policy', legal.PRIVACY],
  ['refunds', 'Refund and Cancellation Policy', legal.REFUNDS],
  ['pricing', 'Plans and pricing', legal.PRICING],
  ['contact', 'Contact us', legal.CONTACT_PAGE],
];
const legalTpl = fs.readFileSync(path.join(src, 'legal.template.html'), 'utf8');
for (const [slug, title, sections] of pages) {
  if (!Array.isArray(sections)) throw new Error(`${title}: text not found in legal.ts`);
  const body = sections.map((s) => `<h2>${esc(s.heading)}</h2>\n  ${s.body.map((p) => `<p>${esc(p)}</p>`).join('\n  ')}`).join('\n  ');
  fs.mkdirSync(path.join(out, slug));
  fs.writeFileSync(path.join(out, slug, 'index.html'), fill(legalTpl, { ...common, TITLE: esc(title), UPDATED: esc(legal.LEGAL_UPDATED), BODY: body }));
}

fs.copyFileSync(path.join(root, 'assets/favicon.png'), path.join(out, 'favicon.png'));
// Any other address on this little site shows the sign-up page (Netlify).
fs.writeFileSync(path.join(out, '_redirects'), '/*  /index.html  200\n');

console.log(`Coming soon site ready in coming-soon/out (${pages.length + 1} pages). Business button: ${wa ? 'WhatsApp ' + wa : 'email (add COMING_SOON_WHATSAPP to .env for WhatsApp)'}.`);
console.log('Nothing has been put online. Follow coming-soon/README.md when you are ready.');
