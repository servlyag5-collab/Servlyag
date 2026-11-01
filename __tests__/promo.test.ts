import { promoDiscount, promoMonthsLeft, type Promo } from '../src/lib/promo';

const launch: Promo = { code: 'LAUNCH50', percent_off: 50, months: 2, months_used: 0, hold_until: '2026-11-08T00:00:00Z' };

describe('Promo codes', () => {
  it('takes half off the plan price', () => {
    expect(promoDiscount(100, launch)).toBe(50);
    expect(promoDiscount(170, launch)).toBe(85);
    expect(promoDiscount(50, null)).toBe(0);
  });
  it('stops after its months are used', () => {
    expect(promoDiscount(100, { ...launch, months_used: 1 })).toBe(50);
    expect(promoDiscount(100, { ...launch, months_used: 2 })).toBe(0);
  });
  it('says how many months are left', () => {
    expect(promoMonthsLeft(launch)).toBe('for your first 2 months');
    expect(promoMonthsLeft({ ...launch, months_used: 1 })).toBe('for your next month');
  });
});
