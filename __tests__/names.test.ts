import { customerName } from '../src/lib/names';

describe('screen name vs business name', () => {
  const kim = { display_name: "Kim's Kitchen", screen_name: 'Kim' };
  it('uses the screen name in Customer view', () => expect(customerName(kim, false)).toBe('Kim'));
  it('uses the business name in Merchant view', () => expect(customerName(kim, true)).toBe("Kim's Kitchen"));
  it('falls back when one is missing', () => {
    expect(customerName({ display_name: '', screen_name: 'Kim' }, true)).toBe('Kim');
    expect(customerName({ display_name: 'Old Name' }, false)).toBe('Old Name');
    expect(customerName(null)).toBe('Customer');
  });
});
