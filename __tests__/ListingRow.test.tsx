jest.mock('../src/lib/supabase', () => ({ supabase: { storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) } } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null })); // icon fonts can't load in tests
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { render, screen } from '@testing-library/react-native';
import { ListingRow, type CardListing } from '../src/components/ListingRow';
import type { Hours } from '../src/lib/hours';

const day = (open: boolean) => ({ open, from: '00:00', to: '00:00' }); // 00:00 to midnight = open all day
const allDay = (open: boolean): Hours => ({ mon: day(open), tue: day(open), wed: day(open), thu: day(open), fri: day(open), sat: day(open), sun: day(open) });
const card = (id: string, extra: Partial<CardListing>): CardListing => ({
  id, merchant_id: 'm', title: `Listing ${id}`, photos: [], price: 50, price_from: false, city: "St. John's", village: null,
  profiles: { display_name: 'Demo' }, ...extra,
});

describe('Home card "Open" badge', () => {
  it('shows Open only for listings that show hours and are open now', async () => {
    await render(<ListingRow title="Test" ratings={{}} rows={[
      card('a', { show_hours: true, hours: allDay(true) }),   // open: badge
      card('b', { show_hours: true, hours: allDay(false) }),  // closed: nothing
      card('c', { show_hours: false, hours: allDay(true) }),  // hours switched off: nothing
    ]} />);
    expect(screen.getAllByText('Open').length).toBe(1);
  });
});
