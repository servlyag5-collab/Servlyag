// The booking helpers talk to Supabase; the tests don't need a real connection.
jest.mock('../src/lib/supabase', () => ({ supabase: {} }));

import { antigua, bookingWhen, clock, fromAntigua, statusInfo, type Booking } from '../src/lib/bookings';

describe('Antigua time (UTC-4, no daylight saving)', () => {
  it('turns an Antigua date and time into the right moment, and back', () => {
    const iso = fromAntigua(2026, 10, 3, 14, 30); // 3 November 2026, 2:30 PM in Antigua
    expect(iso).toBe('2026-11-03T18:30:00.000Z');
    expect(antigua(iso)).toMatchObject({ y: 2026, m: 10, d: 3, h: 14, min: 30 });
  });
  it('shows a booking the way customers read it', () => {
    expect(bookingWhen('2026-11-03T18:30:00.000Z')).toBe('Tuesday 3 November 2026, 2:30 PM');
  });
  it('uses a 12-hour clock', () => {
    expect(clock(0, 0)).toBe('12:00 AM');
    expect(clock(9, 5)).toBe('9:05 AM');
    expect(clock(12, 0)).toBe('12:00 PM');
    expect(clock(20, 30)).toBe('8:30 PM');
  });
});

describe('booking status labels', () => {
  const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const b = (status: Booking['status'], starts_at: string) => ({ status, starts_at }) as Booking;

  it('asks the customer to confirm, and tells the merchant it is waiting', () => {
    expect(statusInfo(b('pending', future), false).label).toBe('Please confirm');
    expect(statusInfo(b('pending', future), true).label).toBe('Waiting for customer');
  });
  it('marks unanswered past bookings as expired and past confirmed ones as completed', () => {
    expect(statusInfo(b('pending', past), true).label).toBe('Expired');
    expect(statusInfo(b('confirmed', past), false).label).toBe('Completed');
  });
  it('shows cancelled and declined bookings', () => {
    expect(statusInfo(b('cancelled', future), false).label).toBe('Cancelled');
    expect(statusInfo(b('declined', future), true).label).toBe('Declined');
  });
});
