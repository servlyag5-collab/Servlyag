jest.mock('../src/lib/supabase', () => ({ supabase: {} }));
import { planStatus } from '../src/lib/trial';

const day = (d: string) => new Date(d).toLocaleDateString();

describe('planStatus', () => {
  it('shows paid time as "active until"', () => {
    expect(planStatus('Growth', '2027-02-01T12:00:00Z', null)).toBe(`Growth · active until ${day('2027-02-01T12:00:00Z')}`);
  });
  it('shows a free trial', () => {
    const end = '2027-01-29T12:00:00Z';
    expect(planStatus('Business', end, end)).toBe(`Business · free trial until ${day(end)}`);
  });
  it('shows paid time after the trial', () => {
    const trial = '2027-01-29T12:00:00Z', paid = '2027-02-28T12:00:00Z';
    expect(planStatus('Starter', paid, trial)).toBe(`Starter · free trial until ${day(trial)}, then paid until ${day(paid)}`);
  });
});
