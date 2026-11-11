// Servly AG monthly charges: every morning (pg_cron job "servly-renewals", database v33) this charges the
// saved card of each merchant whose plan ends in the next 24 hours, and tries failed ones again (3 days).
//   https://<project>.supabase.co/functions/v1/payment-renewals   (POST)
//
// The database decides what is due (renewals_due: at most one try a day per renewal), so calling this
// more often never charges anyone twice. Each answer goes to renewal_result, which adds the month and the
// receipt (activate_plan) or keeps the listings visible and tells the merchant.
//
// Secrets: CYBS_MERCHANT_ID, CYBS_REST_KEY_ID, CYBS_REST_SECRET (Key Management > REST - Shared Secret), CYBS_ENV.
// Deploy without the login check (the daily job has no Servly login): see supabase/config.toml.
import { chargeResult, REST_HOST, renewalBody, restHeaders } from '../_shared/cybersource.ts';
import { admin, json } from '../_shared/record.ts';

type Due = { charge_id: string; merchant: string; token: string; charge_amount: number; charge_currency: string; previous_ref: string | null; attempt_no: number };
const PATH = '/pts/v2/payments';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: true, service: 'servly payment-renewals' });

  const merchantId = Deno.env.get('CYBS_MERCHANT_ID'), keyId = Deno.env.get('CYBS_REST_KEY_ID'), secret = Deno.env.get('CYBS_REST_SECRET');
  if (!merchantId || !keyId || !secret) return json({ error: 'Monthly charges are not set up yet (REST key secrets missing).' }, 503);
  const host = REST_HOST[Deno.env.get('CYBS_ENV') === 'live' ? 'live' : 'test'];

  const db = admin();
  const { data, error } = await db.rpc('renewals_due');
  if (error) return json({ error: error.message }, 500);

  const done: { charge: string; ok: boolean }[] = [];
  for (const c of (data ?? []) as Due[]) {
    let r: ReturnType<typeof chargeResult>;
    try {
      const body = JSON.stringify(renewalBody({
        reference: `${c.charge_id}-${c.attempt_no}`, token: c.token, amount: Number(c.charge_amount),
        currency: c.charge_currency, previousTransactionId: c.previous_ref,
      }));
      const res = await fetch(`https://${host}${PATH}`, {
        method: 'POST', body, headers: restHeaders({ host, merchantId, keyId, secret, path: PATH, body }),
      });
      r = chargeResult(res.status, await res.json().catch(() => ({})));
    } catch (e) {
      r = { ok: false, id: null, reason: 'NETWORK', message: `Could not reach CyberSource: ${(e as Error).message}` };
    }
    // Visible in Supabase > Edge Functions > payment-renewals > Logs (never card details).
    console.log('renewal', c.charge_id, 'try', c.attempt_no, r.ok ? 'paid' : 'failed', r.reason ?? '', r.message ?? '');
    await db.rpc('renewal_result', { p_charge: c.charge_id, p_ok: r.ok, p_transaction: r.id, p_reason: r.reason, p_message: r.message });
    done.push({ charge: c.charge_id, ok: r.ok });
  }
  return json({ ok: true, tried: done.length, paid: done.filter((d) => d.ok).length });
});
