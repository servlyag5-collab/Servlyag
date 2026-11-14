jest.mock('../src/lib/supabase', () => ({ supabase: {} }));
import { abstOf, ratePct, ABST_OFF } from '../src/lib/abst';

const ON = { on: true, rate: 17, number: 'ABST-123' };

describe('ABST', () => {
  it('adds nothing while ABST is off', () => {
    expect(abstOf(50, ABST_OFF)).toBe(0);
    expect(abstOf(195, ABST_OFF)).toBe(0);
  });
  it('is 17% of each plan, rounded to the cent', () => {
    expect(abstOf(50, ON)).toBe(8.5);    // Starter: 58.50 total
    expect(abstOf(100, ON)).toBe(17);    // Growth: 117.00 total
    expect(abstOf(170, ON)).toBe(28.9);  // Business: 198.90 total
    expect(abstOf(125, ON)).toBe(21.25); // Growth + bookings upgrade: 146.25 total
  });
  it('is worked out after a promo discount', () => {
    expect(abstOf(50 - 25, ON)).toBe(4.25); // Starter at half price
  });
  it('is 0 on a free amount', () => {
    expect(abstOf(0, ON)).toBe(0);
  });
  it('shows the rate as people read it', () => {
    expect(ratePct(ON)).toBe('17%');
    expect(ratePct({ ...ON, rate: 12.5 })).toBe('12.5%');
  });
});
