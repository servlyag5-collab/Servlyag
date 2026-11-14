// Servly AG: where CyberSource sends the merchant's browser after the payment page
// (Secure Acceptance profile > Customer Response > Transaction Response Page and Cancel Response Page).
// It checks CyberSource's signature, records the result (a paid order switches the plan on), then sends
// the merchant on to the app's "payment result" page.
//
// Secrets: CYBS_SECRET_KEY, APP_URL (the website, e.g. https://servlyag.com; no slash at the end).
import { verifyFields } from '../_shared/cybersource.ts';
import { formFields, recordAnswer } from '../_shared/record.ts';

Deno.serve(async (req) => {
  const app = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '');
  const go = (status: string, order = '') =>
    // To the payment result page (owner's choice, 2026-11-13): it sends a logged-in merchant on to Account (plan,
    // receipt, listings, with how the payment went at the top), and someone who paid from the phone app back to the app.
    new Response(null, { status: 303, headers: { Location: `${app}/payment-result?status=${status}${order ? `&order=${encodeURIComponent(order)}` : ''}` } });

  if (req.method !== 'POST') return go('error');
  const secretKey = Deno.env.get('CYBS_SECRET_KEY') ?? '';
  const f = await formFields(req).catch(() => ({} as Record<string, string>));
  if (!secretKey || !verifyFields(f, secretKey)) {
    console.log('payment-return: signature check failed', f.req_reference_number);
    return go('error', f.req_reference_number);
  }
  const r = await recordAnswer(f);
  return go(r.status, r.order);
});
