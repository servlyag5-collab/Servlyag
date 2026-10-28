jest.mock('../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null })); // icon fonts can't load in tests
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));

import { fireEvent, render, screen } from '@testing-library/react-native';
import { MoreText } from '../src/components/Reviews';

describe('Review "Read more"', () => {
  it('has no button for a short review', async () => {
    await render(<MoreText text="was ok" style={{}} />);
    expect(screen.queryByText('Read more')).toBeNull();
  });
  it('shortens a long review until Read more is tapped', async () => {
    await render(<MoreText text={'Great service. '.repeat(30)} style={{}} />);
    await fireEvent.press(screen.getByText('Read more'));
    expect(screen.getByText('Show less')).toBeTruthy();
  });
});
