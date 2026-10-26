import { formatPrice } from '../src/lib/price';

// How prices show to customers everywhere in the app.
describe('formatPrice', () => {
  it('shows a fixed price', () => expect(formatPrice(30)).toBe('EC$30'));
  it('shows a starting price with "From"', () => expect(formatPrice(500, true)).toBe('From EC$500'));
  it('keeps cents when there are any', () => expect(formatPrice(45.5)).toBe('EC$45.50'));
  it('asks for a price when none is set', () => {
    expect(formatPrice(null)).toBe('Ask for price');
    expect(formatPrice(undefined, true)).toBe('Ask for price');
  });
});
