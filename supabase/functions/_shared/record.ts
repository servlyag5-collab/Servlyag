// Records CyberSource's (already verified) answer for a payment order. Used by payment-return (the
// merchant's browser coming back) and payment-webhook (CyberSource's server-to-server message); whichever
// arrives first does the work, the other finds it done. A paid order runs activate_plan exactly once.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { outcome } from './cybersource.ts';

export const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

export type Recorded = { order: string; status: string };

export async function recordAnswer(f: Record<string, string>): Promise<Recorded> {
  const db = admin();
  const orderId = f.req_reference_number ?? '';
  const { data: order } = await db.from('payment_orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return { order: orderId, status: 'error' };
  if (order.status === 'paid') return { order: order.id, status: 'paid' };

  const result = outcome(f.decision);
  // Visible in Supabase > Edge Functions > Logs (no card details: CyberSource only sends a masked number).
  console.log('payment answer', orderId, f.decision, 'reason', f.reason_code, f.message, f.auth_response ?? '', f.req_currency, f.req_amount);
  const note = { decision: f.decision ?? null, reason_code: f.reason_code ?? null, message: f.message ?? null, updated_at: new Date().toISOString() };

  if (result !== 'paid') {
    // Only a still-open order changes; a late "cancel" never undoes a payment.
    if (result !== 'pending') await db.from('payment_orders').update({ ...note, status: result }).eq('id', order.id).eq('status', 'pending');
    return { order: order.id, status: result };
  }

  // The amount and currency CyberSource charged must be exactly what Servly asked for.
  const charged = Number(f.auth_amount || f.req_amount);
  if (Math.abs(charged - Number(order.amount)) > 0.009 || (f.req_currency ?? '').toUpperCase() !== order.currency) {
    await db.from('payment_orders').update({ ...note, status: 'error', message: `Charged ${charged} ${f.req_currency}, expected ${order.amount} ${order.currency}` }).eq('id', order.id);
    return { order: order.id, status: 'error' };
  }

  // Claim the order (only one of return/webhook gets past this line).
  const { data: claimed } = await db.from('payment_orders')
    .update({ ...note, status: 'paid', transaction_id: f.transaction_id ?? null, paid_at: new Date().toISOString() })
    .eq('id', order.id).neq('status', 'paid').select('id');
  if (!claimed?.length) return { order: order.id, status: 'paid' };

  const { error } = await db.rpc('activate_plan', {
    p_user: order.merchant_id, p_tier: order.tier_id, p_booking: order.booking, p_provider: 'cybersource', p_ref: f.transaction_id ?? order.id,
  });
  if (error) {
    // Money was taken but the plan didn't switch on: the owner sees this order as "error" and fixes it in Admin.
    await db.from('payment_orders').update({ status: 'error', message: `Paid, but the plan didn't switch on: ${error.message}` }).eq('id', order.id);
    return { order: order.id, status: 'error' };
  }

  // Save the card as a token for the monthly charges (never the card number).
  if (f.payment_token && order.merchant_id) {
    const last4 = (f.req_card_number ?? '').replace(/\D/g, '').slice(-4) || null;
    await db.from('billing_cards').upsert({
      merchant_id: order.merchant_id, provider: 'cybersource', payment_token: f.payment_token,
      card_last4: last4, card_type: f.req_card_type ?? null, card_expiry: f.req_card_expiry_date ?? null, updated_at: new Date().toISOString(),
    });
  }
  return { order: order.id, status: 'paid' };
}

// Form posts from CyberSource arrive as application/x-www-form-urlencoded.
export async function formFields(req: Request): Promise<Record<string, string>> {
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
