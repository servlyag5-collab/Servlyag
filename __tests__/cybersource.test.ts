import { createHmac } from 'crypto';
import { outcome, paymentFields, signedDateTime, signFields, verifyFields, verifyWebhook } from '../supabase/functions/_shared/cybersource';

const SECRET = 'test-secret-key';

describe('Secure Acceptance signing', () => {
  const fields = paymentFields({
    accessKey: 'AK', profileId: 'PID', secretKey: SECRET, uuid: 'u-1', reference: 'order-1',
    amount: 50, currency: 'XCD', email: 'm@example.com', now: new Date('2026-11-07T14:03:09.123Z'), saveCard: true,
  });

  it('signs every field it sends, in order, as name=value,name=value', () => {
    const names = fields.signed_field_names.split(',');
    expect(names).toEqual(expect.arrayContaining(['access_key', 'profile_id', 'amount', 'currency', 'reference_number', 'signed_field_names']));
    const data = names.map((n) => `${n}=${fields[n]}`).join(',');
    expect(fields.signature).toBe(createHmac('sha256', SECRET).update(data).digest('base64'));
  });

  it('uses the price with 2 decimals, the date without milliseconds, and saves the card as a token', () => {
    expect(fields.amount).toBe('50.00');
    expect(fields.signed_date_time).toBe('2026-11-07T14:03:09Z');
    expect(fields.transaction_type).toBe('sale,create_payment_token');
    expect(paymentFields({ accessKey: 'A', profileId: 'P', secretKey: SECRET, uuid: 'u', reference: 'r', amount: 1, currency: 'XCD' }).transaction_type).toBe('sale');
    expect(signedDateTime(new Date('2026-01-02T03:04:05.000Z'))).toBe('2026-01-02T03:04:05Z');
  });

  it('accepts an untouched answer and refuses a changed one', () => {
    const answer: Record<string, string> = { decision: 'ACCEPT', req_amount: '50.00', req_reference_number: 'order-1' };
    answer.signed_field_names = 'decision,req_amount,req_reference_number,signed_field_names';
    answer.signature = signFields(answer, SECRET);
    expect(verifyFields(answer, SECRET)).toBe(true);
    expect(verifyFields({ ...answer, req_amount: '1.00' }, SECRET)).toBe(false);
    expect(verifyFields(answer, 'wrong-key')).toBe(false);
    expect(verifyFields({ decision: 'ACCEPT' }, SECRET)).toBe(false);
  });
});

describe('webhook signature', () => {
  const key = Buffer.from('webhook-key-bytes').toString('base64');
  const body = '{"eventType":"payments.payments.accept"}';
  const sig = createHmac('sha256', Buffer.from(key, 'base64')).update(`1700000000.${body}`).digest('base64');

  it('accepts a correctly signed message', () => {
    expect(verifyWebhook(`t=1700000000;keyId=K1;sig=${sig}`, body, key, 'K1')).toBe(true);
  });
  it('refuses a changed body, another key id, or no header', () => {
    expect(verifyWebhook(`t=1700000000;keyId=K1;sig=${sig}`, body + ' ', key, 'K1')).toBe(false);
    expect(verifyWebhook(`t=1700000000;keyId=K2;sig=${sig}`, body, key, 'K1')).toBe(false);
    expect(verifyWebhook(null, body, key)).toBe(false);
  });
});

it('turns CyberSource decisions into Servly order statuses', () => {
  expect(outcome('ACCEPT')).toBe('paid');
  expect(outcome('CANCEL')).toBe('cancelled');
  expect(outcome('REVIEW')).toBe('pending');
  expect(outcome('DECLINE')).toBe('declined');
  expect(outcome(undefined)).toBe('declined');
});
