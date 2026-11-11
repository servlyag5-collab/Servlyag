// Shared CyberSource helpers for Servly's server functions (Deno), also tested from jest (__tests__).
// Only node:crypto is used, so the same file runs in both.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

// Secure Acceptance (the hosted payment page): signs "name=value,name=value" for the fields listed in
// signed_field_names, with the profile's Secret Key, HMAC-SHA256, Base64.
export function signFields(fields: Record<string, string>, secretKey: string): string {
  const names = (fields.signed_field_names ?? '').split(',').filter(Boolean);
  const data = names.map((n) => `${n}=${fields[n] ?? ''}`).join(',');
  return createHmac('sha256', secretKey).update(data, 'utf8').digest('base64');
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// CyberSource's answer (return page and Merchant POST) is signed the same way. True only when untouched.
export function verifyFields(fields: Record<string, string>, secretKey: string): boolean {
  if (!fields.signature || !fields.signed_field_names) return false;
  return same(signFields(fields, secretKey), fields.signature);
}

// "2026-11-07T14:03:09Z": the date format Secure Acceptance wants (UTC, no milliseconds).
export const signedDateTime = (d = new Date()) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

export const PAY_PAGE = {
  test: 'https://testsecureacceptance.cybersource.com/pay',
  live: 'https://secureacceptance.cybersource.com/pay',
};

// The fields for one payment: first payment saves the card as a token (for the monthly charges later).
export function paymentFields(o: {
  accessKey: string; profileId: string; secretKey: string; uuid: string;
  reference: string; amount: number; currency: string; email?: string; now?: Date;
  saveCard?: boolean; // also save the card as a token (needs Payment Tokenization on the profile)
}): Record<string, string> {
  const fields: Record<string, string> = {
    access_key: o.accessKey,
    profile_id: o.profileId,
    transaction_uuid: o.uuid,
    signed_date_time: signedDateTime(o.now),
    locale: 'en',
    transaction_type: o.saveCard ? 'sale,create_payment_token' : 'sale',
    reference_number: o.reference,
    amount: o.amount.toFixed(2),
    currency: o.currency,
    payment_method: 'card',
    ...(o.email ? { bill_to_email: o.email } : {}),
  };
  fields.unsigned_field_names = '';
  fields.signed_field_names = [...Object.keys(fields), 'signed_field_names'].join(',');
  fields.signature = signFields(fields, o.secretKey);
  return fields;
}

// Webhooks (REST notifications): header v-c-signature "t=<time>;keyId=<id>;sig=<base64>", where sig is
// HMAC-SHA256 of "<t>.<body>" with the Base64-decoded digital signature key.
export function verifyWebhook(header: string | null, body: string, key: string, keyId?: string): boolean {
  if (!header || !key) return false;
  const parts = Object.fromEntries(header.split(';').map((p) => {
    const i = p.indexOf('=');
    return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
  }));
  if (!parts.t || !parts.sig) return false;
  if (keyId && parts.keyId && parts.keyId !== keyId) return false;
  const sig = createHmac('sha256', Buffer.from(key, 'base64')).update(`${parts.t}.${body}`, 'utf8').digest('base64');
  return same(sig, parts.sig);
}

// REST API (monthly charges of a saved card). Each request is signed with the REST Shared Secret key
// ("HTTP Signature"): HMAC-SHA256, with the Base64-decoded secret, of the lines
// "host: ...", "date: ...", "request-target: post /path", "digest: SHA-256=<body hash>", "v-c-merchant-id: ...".
export const REST_HOST = { test: 'apitest.cybersource.com', live: 'api.cybersource.com' };

export function restHeaders(o: {
  host: string; merchantId: string; keyId: string; secret: string; path: string; body: string; date?: string;
}): Record<string, string> {
  const date = o.date ?? new Date().toUTCString();
  const digest = 'SHA-256=' + createHash('sha256').update(o.body, 'utf8').digest('base64');
  const lines = [`host: ${o.host}`, `date: ${date}`, `request-target: post ${o.path}`, `digest: ${digest}`, `v-c-merchant-id: ${o.merchantId}`];
  const sig = createHmac('sha256', Buffer.from(o.secret, 'base64')).update(lines.join('\n'), 'utf8').digest('base64');
  return {
    'Content-Type': 'application/json',
    'v-c-merchant-id': o.merchantId,
    date,
    digest,
    signature: `keyid="${o.keyId}", algorithm="HmacSHA256", headers="host date request-target digest v-c-merchant-id", signature="${sig}"`,
  };
}

// One monthly charge of a saved card: a merchant-initiated recurring payment, captured at once.
export function renewalBody(o: { reference: string; token: string; amount: number; currency: string; previousTransactionId?: string | null }) {
  return {
    clientReferenceInformation: { code: o.reference },
    processingInformation: {
      capture: true,
      commerceIndicator: 'recurring',
      authorizationOptions: {
        initiator: {
          type: 'merchant',
          storedCredentialUsed: true,
          ...(o.previousTransactionId ? { merchantInitiatedTransaction: { previousTransactionId: o.previousTransactionId } } : {}),
        },
      },
    },
    paymentInformation: { customer: { id: o.token } },
    orderInformation: { amountDetails: { totalAmount: o.amount.toFixed(2), currency: o.currency } },
  };
}

// What CyberSource's REST answer means: paid only when the card was authorised (and captured).
export function chargeResult(httpStatus: number, r: {
  id?: string; status?: string; errorInformation?: { reason?: string; message?: string }; reason?: string; message?: string;
}): { ok: boolean; id: string | null; reason: string | null; message: string | null } {
  const ok = httpStatus === 201 && r.status === 'AUTHORIZED';
  return {
    ok,
    id: r.id ?? null,
    reason: r.errorInformation?.reason ?? r.reason ?? r.status ?? (ok ? null : `HTTP ${httpStatus}`),
    message: r.errorInformation?.message ?? r.message ?? null,
  };
}

// What a signed answer means for Servly.
export function outcome(decision: string | undefined): 'paid' | 'declined' | 'cancelled' | 'pending' {
  switch ((decision ?? '').toUpperCase()) {
    case 'ACCEPT': return 'paid';
    case 'CANCEL': return 'cancelled';
    case 'REVIEW': return 'pending';  // held by CyberSource for a fraud check: wait for the final answer
    default: return 'declined';       // DECLINE, ERROR
  }
}
