const mockRpc = jest.fn(() => Promise.resolve({ data: null, error: null }));
jest.mock('../src/lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...(a as [])) } }));
import { noteSearch, resetSearchLog, worthLogging } from '../src/lib/searchLog';

const s = (q: string, results = 3, city = '', village = '') => ({ q, city, village, results });

beforeEach(() => { mockRpc.mockClear(); resetSearchLog(); });

describe('search insights', () => {
  it('skips empty and one-letter searches', () => {
    expect(worthLogging(s(''))).toBe(false);
    expect(worthLogging(s('p'))).toBe(false);
    expect(worthLogging(s('', 3, 'St. John'))).toBe(true); // only a parish still counts
  });
  it('never keeps contact details', () => {
    expect(worthLogging(s('268 555 1234'))).toBe(false);
    expect(worthLogging(s('jojo@gmail.com'))).toBe(false);
    expect(worthLogging(s('photographer 2026'))).toBe(true); // a year is not a phone number
  });
  it('records a finished search once', () => {
    expect(noteSearch(s('Wedding  Caterer', 0), 1000)).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('log_search', { p_q: 'Wedding  Caterer', p_city: '', p_village: '', p_results: 0 });
    expect(noteSearch(s('wedding caterer', 0), 2000)).toBe(false); // same words again
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
  it('counts the same search again after 10 minutes, or a different place', () => {
    noteSearch(s('nails'), 0);
    expect(noteSearch(s('nails', 3, 'St. Mary'), 1000)).toBe(true);
    expect(noteSearch(s('nails', 3, 'St. Mary'), 1000 + 11 * 60 * 1000)).toBe(true);
  });
});
