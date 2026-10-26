jest.mock('../src/lib/supabase', () => ({ supabase: {} }));

import { isUnread, phoneDigits, type Conversation } from '../src/lib/chat';

describe('phone numbers', () => {
  it('adds the Antigua and Barbuda code (1-268) to 7-digit local numbers', () => {
    expect(phoneDigits('776-6451')).toBe('12687766451');
  });
  it('leaves full numbers alone', () => {
    expect(phoneDigits('+1 (268) 776-6451')).toBe('12687766451');
  });
});

describe('unread conversations', () => {
  const base: Conversation = {
    id: 'c', service_id: 's', customer_id: 'cust', merchant_id: 'merch', contact: null,
    last_message: 'Hello', last_message_at: '2026-10-24T12:00:00Z', customer_read_at: null, merchant_read_at: null,
  };
  it('is unread when a message arrived after I last read it', () => {
    expect(isUnread({ ...base, merchant_read_at: '2026-10-24T11:00:00Z' }, 'merch')).toBe(true);
  });
  it('is read once I have opened it since', () => {
    expect(isUnread({ ...base, customer_read_at: '2026-10-24T12:05:00Z' }, 'cust')).toBe(false);
  });
  it('is never unread when there are no messages yet', () => {
    expect(isUnread({ ...base, last_message: '' }, 'merch')).toBe(false);
  });
});
