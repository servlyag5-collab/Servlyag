jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null })); // icon fonts can't load in tests
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
const mockRpc = jest.fn();
jest.mock('../src/lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
jest.setTimeout(20000);

import { fireEvent, render, screen } from '@testing-library/react-native';
import { SearchSuggestions } from '../src/components/SearchSuggestions';

const items = [
  { kind: 'business', label: 'yonnie J photo media events', merchant_id: 'm1', service_id: 's1' },
  { kind: 'business', label: 'Island Fresh Cleaning', merchant_id: 'm2', service_id: null },
  { kind: 'service', label: 'Photography', merchant_id: null, service_id: null },
];

describe('Search suggestions under the Home search box', () => {
  beforeEach(() => { mockPush.mockClear(); mockRpc.mockReset(); mockRpc.mockResolvedValue({ data: items }); });

  it('shows businesses and services; a business opens straight away, a service searches for it', async () => {
    const onSearch = jest.fn();
    await render(<SearchSuggestions q="yonnie" show onSearch={onSearch} />);
    expect(await screen.findByText('yonnie J photo media events', {}, { timeout: 3000 })).toBeTruthy();
    expect(mockRpc).toHaveBeenCalledWith('search_suggestions', { p_q: 'yonnie' });
    expect(screen.getByText('Businesses')).toBeTruthy();
    expect(screen.getByText('Services')).toBeTruthy();
    await fireEvent.press(screen.getByText('yonnie J photo media events'));          // one listing: open it
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/service/[id]', params: { id: 's1' } });
    await fireEvent.press(screen.getByText('Island Fresh Cleaning'));                // several: business profile
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/business/[id]', params: { id: 'm2' } });
    await fireEvent.press(screen.getByText('Photography'));
    expect(onSearch).toHaveBeenCalledWith('Photography');
  });

  it('stays hidden for one letter, or when the box is not being typed in', async () => {
    await render(<SearchSuggestions q="y" show onSearch={() => {}} />);
    await new Promise((r) => setTimeout(r, 400));
    expect(mockRpc).not.toHaveBeenCalled();
    await render(<SearchSuggestions q="yonnie" show={false} onSearch={() => {}} />);
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.queryByText('Businesses')).toBeNull();
  });
});
