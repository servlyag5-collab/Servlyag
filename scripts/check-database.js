// Read-only check that the newer database updates are installed in Supabase.
// Run with: npm run check:db
// It signs in as a guest (the public anon key from .env) and asks for one table, column or
// function from each update. "Permission denied" still proves the thing exists; "not found" means
// the update was not run. Nothing is changed, and no secret keys are used.
const fs = require('fs');
const path = require('path');

const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const ZERO = '00000000-0000-0000-0000-000000000000';
// [version, what it adds, how to find it]
const checks = [
  ['v18', 'photo focus points', { get: 'services?select=photo_focus&limit=1' }],
  ['v19', 'search as you type', { rpc: 'search_services', body: { p_q: 'test' } }],
  ['v20', 'plan downgrades and paused listings', { rpc: 'my_plan_change', body: {} }],
  ['v21', 'word-start search (replaced by v24 and v25)', { rpc: 'search_words', body: { p: 'ac' } }],
  ['v22', 'free trials: table', { get: 'free_trials?select=merchant_id&limit=1' }],
  ['v22', 'free trials: admin start', { rpc: 'admin_start_free_trial', body: { p_user: ZERO, p_tier: 'basic' } }],
  ['v23', 'promo codes: table', { get: 'promo_codes?select=code&limit=1' }],
  ['v23', 'promo codes: apply at checkout', { rpc: 'apply_promo_code', body: { p_code: 'X' } }],
  ['v23', 'promo codes: discount on receipts', { get: 'payments?select=discount,promo_code&limit=1' }],
  ['v24', 'search everywhere (business name, word roots)', { rpc: 'search_stem', body: { w: 'cleaning' } }],
  ['v25', 'smart search (short words match word starts)', { rpc: 'search_norm', body: { t: 'AC' } }],
  ['v26', 'admin controls (change plan, add days, listings on/off)', { rpc: 'admin_set_listing_on', body: { p_service: ZERO, p_on: false } }],
  // v27 only adds a read rule for admins; it can't be seen from outside, so it has no check here.
  ['v28', 'free bookings (Admin "Bookings on, no charge")', { rpc: 'admin_stop_free_booking', body: { p_user: ZERO } }],
  ['v29', 'call taps (Admin call counts)', { rpc: 'antigua_month_start', body: {} }],
  ['v30', 'ranked search + suggestions (best match first)', { rpc: 'search_suggestions', body: { p_q: 'test' } }],
  ['v31', 'fair turns (Business plan first, everyone takes turns)', { rpc: 'search_turn_minutes', body: {} }],
  ['v32', 'card payments (payment orders for ACB / CyberSource)', { get: 'payment_orders?select=id&limit=1' }],
  ['v33', 'automatic monthly payments', { rpc: 'my_auto_pay', body: {} }],
  // v34 only changes how notifications are sent (server only); it has no outside check.
  ['v35', 'deleting a listing', { rpc: 'removed_listing_titles', body: { p_ids: [] } }],
  // v36 only changes what happens to reviews when an account is deleted; it has no outside check.
];

const MISSING = ['PGRST202', 'PGRST205', '42703', '42883', '42P01'];

async function exists(c) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const res = c.rpc
    ? await fetch(`${url}/rest/v1/rpc/${c.rpc}`, { method: 'POST', headers, body: JSON.stringify(c.body) })
    : await fetch(`${url}/rest/v1/${c.get}`, { headers });
  if (res.ok) return true;
  const body = await res.json().catch(() => ({}));
  return !MISSING.includes(body.code);
}

(async () => {
  console.log('Servly database check (read only)\n');
  let problems = 0;
  for (const [version, label, c] of checks) {
    let ok;
    try { ok = await exists(c); } catch (e) { console.log(`?   ${version}  ${label}: could not reach Supabase (${e.message})`); problems++; continue; }
    const optional = version === 'v21';
    if (!ok && !optional) problems++;
    console.log(`${ok ? 'OK ' : optional ? '-- ' : 'NO '} ${version}  ${label}${ok ? '' : optional ? ': not run' : ': MISSING'}`);
  }
  console.log(problems ? `\n${problems} problem(s) found.` : '\nAll required updates are installed.');
  process.exit(problems ? 1 : 0);
})();
