// Servly AG: start a card payment (CyberSource Secure Acceptance Hosted Checkout).
//
// 1. POST (logged-in merchant, from Checkout) { tier, booking }  ->  { order, secret }
//    Servly works out the price itself (plan - promo discount + bookings upgrade, the same sum as
//    activate_plan), and saves it as a payment order.
// 2. GET ?order=...&s=...  (from the website's /pay page)  ->  { action, fields }
//    The signed form that sends the merchant to CyberSource's payment page. The signature means nobody
//    can change the amount on the way. Works for 1 hour after pressing Pay.
//
// Secrets (Supabase > Edge Functions > Secrets): CYBS_ACCESS_KEY, CYBS_PROFILE_ID, CYBS_SECRET_KEY, CYBS_ENV.
import { PAY_PAGE, paymentFields } from '../_shared/cybersource.ts';
import { admin, cors, json } from '../_shared/record.ts';

const TIERS = ['basic', 'plus', 'premium'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const db = admin();

  if (req.method === 'POST') {
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await db.auth.getUser(jwt);
    const user = auth?.user;
    if (!user) return json({ error: 'Please log in again.' }, 401);

    let body: { tier?: string; booking?: boolean };
    try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
    const tierId = String(body.tier ?? '');
    if (!TIERS.includes(tierId)) return json({ error: 'Unknown plan' }, 400);

    const { data: tier } = await db.from('tiers').select('monthly_price,booking_included').eq('id', tierId).single();
    const { data: addon } = await db.from('addons').select('monthly_price').eq('id', 'booking').single();
    const { data: profile } = await db.from('profiles').select('booking_requested').eq('id', user.id).single();
    const { data: discount } = await db.rpc('next_promo_discount', { p_user: user.id, p_tier: tierId });
    if (!tier) return json({ error: 'Unknown plan' }, 400);

    // Same rule as activate_plan: the upgrade is charged when ticked now or on the Plan screen.
    const booking = (!!body.booking || !!profile?.booking_requested) && !tier.booking_included;
    const amount = Math.round((Number(tier.monthly_price) - Number(discount ?? 0) + (booking ? Number(addon?.monthly_price ?? 0) : 0)) * 100) / 100;

    const secret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const { data: order, error } = await db.from('payment_orders')
      .insert({ merchant_id: user.id, tier_id: tierId, booking, amount, currency: 'XCD', link_secret: secret })
      .select('id').single();
    if (error || !order) return json({ error: error?.message ?? 'Could not start the payment' }, 500);
    return json({ order: order.id, secret, amount });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const id = url.searchParams.get('order') ?? '';
    const s = url.searchParams.get('s') ?? '';
    // No order: Checkout asks whether the card will be saved for automatic monthly payments (shown before paying).
    if (!id) return json({ saveCard: Deno.env.get('CYBS_SAVE_CARD') === 'yes' });
    const { data: order } = await db.from('payment_orders').select('*').eq('id', id).maybeSingle();
    if (!order || !s || order.link_secret !== s) return json({ error: 'This payment link is not valid.' }, 404);
    if (order.status !== 'pending') return json({ error: 'This payment is already finished.', status: order.status }, 409);
    if (Date.now() - new Date(order.created_at).getTime() > 60 * 60 * 1000) return json({ error: 'This payment link has expired. Please press Pay again.' }, 410);

    const env = Deno.env.get('CYBS_ENV') === 'live' ? 'live' : 'test';
    const accessKey = Deno.env.get('CYBS_ACCESS_KEY'), profileId = Deno.env.get('CYBS_PROFILE_ID'), secretKey = Deno.env.get('CYBS_SECRET_KEY');
    if (!accessKey || !profileId || !secretKey) return json({ error: 'Online payment is not set up yet.' }, 503);

    const { data: u } = await db.auth.admin.getUserById(order.merchant_id);
    const fields = paymentFields({
      accessKey, profileId, secretKey, uuid: crypto.randomUUID(),
      reference: order.id, amount: Number(order.amount), currency: order.currency, email: u?.user?.email ?? undefined,
      // Saving the card (for monthly charges) only once the profile allows it: CyberSource sends a payment
      // that asks for a token to its error page while "Payment Tokenization" is off (found 2026-11-08).
      saveCard: Deno.env.get('CYBS_SAVE_CARD') === 'yes',
    });
    return json({ action: PAY_PAGE[env], fields });
  }

  return json({ error: 'Use GET or POST' }, 405);
});
