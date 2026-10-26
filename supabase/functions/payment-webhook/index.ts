// Servly AG payment webhook (a Supabase Edge Function).
// Your payment provider calls this after a merchant pays; it activates their plan for one month
// and logs the payment (which creates their receipt).
//
// Deploy (once you have chosen a provider):
//   npx supabase login
//   npx supabase link --project-ref YOUR-PROJECT-REF
//   npx supabase secrets set PAYMENT_WEBHOOK_SECRET=a-long-random-password PAYMENT_PROVIDER=yourprovider
//   npx supabase functions deploy payment-webhook --no-verify-jwt
// Then give the provider this address as the webhook URL:
//   https://YOUR-PROJECT-REF.supabase.co/functions/v1/payment-webhook
//
// What it expects (adapt `readPayment` below to your provider's format):
//   POST, header  x-servly-secret: <PAYMENT_WEBHOOK_SECRET>
//   JSON body     { "merchant": "<merchant user id>", "tier": "basic|plus|premium", "booking": true|false,
//                   "amount": 125, "reference": "<the provider's payment id>" }
// The app's Pay button already sends merchant, tier, booking and amount to the provider's page
// (see EXPO_PUBLIC_PAY_URL); most providers pass these back to the webhook as "metadata".

import { createClient } from 'npm:@supabase/supabase-js@2';

type Payment = { merchant: string; tier: string; booking: boolean; amount: number; reference: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// >>> PROVIDER-SPECIFIC: change this to read your provider's webhook format, and replace the secret
// check with the provider's own signature check if it offers one (most do). <<<
async function readPayment(req: Request): Promise<Payment> {
  const b = await req.json();
  return { merchant: String(b.merchant ?? ''), tier: String(b.tier ?? ''), booking: !!b.booking, amount: Number(b.amount), reference: String(b.reference ?? '') };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  // 1. Only your provider knows the secret.
  const secret = Deno.env.get('PAYMENT_WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-servly-secret') !== secret) return json({ error: 'Unauthorized' }, 401);

  let p: Payment;
  try { p = await readPayment(req); } catch { return json({ error: 'Bad request body' }, 400); }
  if (!p.merchant || !p.reference || !['basic', 'plus', 'premium'].includes(p.tier) || !Number.isFinite(p.amount)) {
    return json({ error: 'Missing merchant, tier, amount or reference' }, 400);
  }

  const provider = Deno.env.get('PAYMENT_PROVIDER') ?? 'webhook';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 2. The same payment is never counted twice (providers sometimes resend webhooks).
  const { data: seen } = await db.from('payments').select('id').eq('provider', provider).eq('provider_ref', p.reference).maybeSingle();
  if (seen) return json({ ok: true, duplicate: true });

  // 3. The amount must match the plan price (+ the booking add-on if chosen).
  const { data: tier } = await db.from('tiers').select('monthly_price,booking_included').eq('id', p.tier).single();
  const { data: addon } = await db.from('addons').select('monthly_price').eq('id', 'booking').single();
  if (!tier) return json({ error: 'Unknown tier' }, 400);
  const expected = Number(tier.monthly_price) + (p.booking && !tier.booking_included ? Number(addon?.monthly_price ?? 0) : 0);
  if (Math.abs(p.amount - expected) > 0.01) return json({ error: `Amount ${p.amount} does not match ${expected}` }, 400);

  // 4. Activate: adds one month, sets the tier, switches on booking if paid, logs the payment (receipt).
  const { error } = await db.rpc('activate_plan', {
    p_user: p.merchant, p_tier: p.tier, p_booking: p.booking, p_provider: provider, p_ref: p.reference,
  });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
