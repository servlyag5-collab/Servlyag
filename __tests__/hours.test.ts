jest.mock('../src/lib/supabase', () => ({ supabase: {} }));

import { fromAntigua } from '../src/lib/bookings';
import { DEFAULT_HOURS, hoursProblem, normalizeHours, openStatus, timeLabel, type Hours } from '../src/lib/hours';

// 2 November 2026 is a Monday. Times are Antigua time.
const at = (day: number, h: number, m = 0) => new Date(fromAntigua(2026, 10, day, h, m));

describe('opening hours status', () => {
  it('is open during opening hours', () => {
    expect(openStatus(DEFAULT_HOURS, at(2, 10))).toEqual({ open: true, label: 'Open now · closes at 5:00 PM' });
  });
  it('says when it opens later today', () => {
    expect(openStatus(DEFAULT_HOURS, at(2, 7, 30)).label).toBe('Closed now · opens at 9:00 AM today');
  });
  it('says it opens tomorrow after closing', () => {
    expect(openStatus(DEFAULT_HOURS, at(2, 18)).label).toBe('Closed now · opens at 9:00 AM tomorrow');
  });
  it('skips closed days (Saturday afternoon -> Monday)', () => {
    expect(openStatus(DEFAULT_HOURS, at(7, 15)).label).toBe('Closed now · opens at 9:00 AM Monday');
  });
  it('handles hours that run past midnight', () => {
    const late: Hours = { ...DEFAULT_HOURS, fri: { open: true, from: '20:00', to: '02:00' } };
    expect(openStatus(late, at(6, 23)).label).toBe('Open now · closes at 2:00 AM');   // Friday 11 PM
    expect(openStatus(late, at(7, 1)).open).toBe(true);                              // Saturday 1 AM
  });
});

describe('opening hours helpers', () => {
  it('labels times, with midnight for a 12 AM close', () => {
    expect(timeLabel('13:30')).toBe('1:30 PM');
    expect(timeLabel('00:00', true)).toBe('midnight');
  });
  it('fills in missing days with the defaults', () => {
    expect(normalizeHours({ mon: { open: false } }).mon).toEqual({ open: false, from: '09:00', to: '17:00' });
    expect(normalizeHours(null).sun.open).toBe(false);
  });
  it('catches a day with the same opening and closing time, or no open days', () => {
    expect(hoursProblem({ ...DEFAULT_HOURS, tue: { open: true, from: '09:00', to: '09:00' } })).toMatch(/Tuesday/);
    const allClosed = normalizeHours(Object.fromEntries(Object.keys(DEFAULT_HOURS).map((k) => [k, { open: false }])));
    expect(hoursProblem(allClosed)).toMatch(/at least one day/);
    expect(hoursProblem(DEFAULT_HOURS)).toBeNull();
  });
});
