// Servly AG payment webhook: CyberSource tells Servly about payments here, server to server, so a plan
// switches on even if the merchant closes the browser before coming back.
//   https://<project>.supabase.co/functions/v1/payment-webhook
//
// It accepts two kinds of message:
//   * Secure Acceptance "Merchant POST" (form fields, signed with the profile's Secret Key): the result
//     of a payment made on the hosted payment page. Recorded the same way as payment-return.
//   * Webhooks (JSON, header v-c-signature, signed with the webhook digital signature key): payment and
//     Recurring Billing notifications. For now they are checked and logged (the monthly charges are the
//     next step); CyberSource only needs a 200 answer to finish the subscription.
//
// Secrets: CYBS_SECRET_KEY, CYBS_WEBHOOK_SECRET (the digital signature key), CYBS_WEBHOOK_KEY_ID.
// Deploy without the login check (CyberSource has no Servly login): see supabase/config.toml.
import { verifyFields, verifyWebhook } from '../_shared/cybersource.ts';
import { formFields, json, recordAnswer } from '../_shared/record.ts';

Deno.serve(async (req) => {
  if (req.method === 'GET' || req.method === 'HEAD') return json({ ok: true, service: 'servly payment-webhook' });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const type = req.headers.get('content-type') ?? '';
  if (type.includes('application/x-www-form-urlencoded')) {
    const f = await formFields(req);
    if (!verifyFields(f, Deno.env.get('CYBS_SECRET_KEY') ?? '')) return json({ error: 'Bad signature' }, 401);
    const r = await recordAnswer(f);
    return json({ ok: true, ...r });
  }

  const body = await req.text();
  const key = Deno.env.get('CYBS_WEBHOOK_SECRET') ?? '';
  if (!verifyWebhook(req.headers.get('v-c-signature'), body, key, Deno.env.get('CYBS_WEBHOOK_KEY_ID') ?? undefined)) {
    console.log('payment-webhook: webhook signature check failed');
    return json({ error: 'Bad signature' }, 401);
  }
  let event: { eventType?: string } = {};
  try { event = JSON.parse(body); } catch { /* keep empty */ }
  // Logged for now (Supabase > Edge Functions > payment-webhook > Logs). Monthly charges come next.
  console.log('payment-webhook: event', event.eventType ?? 'unknown', body.slice(0, 2000));
  return json({ ok: true });
});
