const mockRpc = jest.fn(() => Promise.resolve({ error: null }));
jest.mock('../src/lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => (mockRpc as jest.Mock)(...a) } }));

import { Linking } from 'react-native';
import { callBusiness } from '../src/lib/calls';

describe('Call button taps (v29, owner-only counts)', () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  beforeEach(() => { mockRpc.mockClear(); open.mockClear(); });

  it('counts the tap and opens the dialer', async () => {
    await callBusiness('268-555-0101', 'merchant-1', 'listing-1', 'customer-9');
    expect(mockRpc).toHaveBeenCalledWith('record_call_tap', { p_merchant: 'merchant-1', p_service: 'listing-1' });
    expect(open).toHaveBeenCalledWith('tel:268-555-0101');
  });

  it('counts guests too, and profile taps without a listing', async () => {
    await callBusiness('268-555-0101', 'merchant-1', null);
    expect(mockRpc).toHaveBeenCalledWith('record_call_tap', { p_merchant: 'merchant-1', p_service: null });
  });

  it("doesn't count a business calling itself, but still dials", async () => {
    await callBusiness('268-555-0101', 'merchant-1', 'listing-1', 'merchant-1');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalled();
  });
});
