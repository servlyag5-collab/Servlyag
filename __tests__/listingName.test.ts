import { listingName } from '../src/lib/names';

describe('Listed as (v40)', () => {
  it('shows the listing\'s own name when it has one', () => {
    expect(listingName('Green Cut by Jojo', 'Coral Lens')).toBe('Green Cut by Jojo');
  });
  it('uses the business name when Listed as is empty or only spaces', () => {
    expect(listingName(null, 'Coral Lens')).toBe('Coral Lens');
    expect(listingName('   ', 'Coral Lens')).toBe('Coral Lens');
  });
  it('falls back when neither is set', () => {
    expect(listingName(null, '')).toBe('Servly merchant');
    expect(listingName(undefined, undefined, 'Merchant')).toBe('Merchant');
  });
});
