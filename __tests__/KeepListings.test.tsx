jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null })); // icon fonts can't load in tests
jest.mock('../src/lib/supabase', () => ({ supabase: { storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: 'x' } }) }) } } }));
jest.setTimeout(20000);

import { fireEvent, render, screen } from '@testing-library/react-native';
import { KeepListings } from '../src/components/KeepListings';

const listings = ['Photography', 'Wedding photos', 'Passport photos', 'Drone video'].map((title, i) => ({ id: `s${i}`, title, photos: [], photo_focus: {} }));

describe('Choose listings to keep (moving to a smaller plan)', () => {
  it('Starter: exactly one must be chosen, and tapping another swaps it', async () => {
    const onConfirm = jest.fn().mockResolvedValue(null);
    await render(<KeepListings plan="Starter" limit={1} listings={listings} onCancel={() => {}} onConfirm={onConfirm} />);
    expect(screen.getByText('Choose the listing to keep')).toBeTruthy();
    expect(screen.getByText(/can't swap paused and live listings later/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Keep and continue'));
    expect(onConfirm).not.toHaveBeenCalled(); // nothing chosen yet
    await fireEvent.press(screen.getByText('Photography'));
    await fireEvent.press(screen.getByText('Drone video'));
    expect(screen.getByText('1 of 1 chosen')).toBeTruthy();
    await fireEvent.press(screen.getByText('Keep and continue'));
    expect(onConfirm).toHaveBeenCalledWith(['s3']);
  });

  it('Growth: two must be chosen; a third tap is ignored', async () => {
    const onConfirm = jest.fn().mockResolvedValue(null);
    await render(<KeepListings plan="Growth" limit={2} listings={listings} onCancel={() => {}} onConfirm={onConfirm} />);
    await fireEvent.press(screen.getByText('Photography'));
    await fireEvent.press(screen.getByText('Wedding photos'));
    await fireEvent.press(screen.getByText('Passport photos'));
    expect(screen.getByText('2 of 2 chosen')).toBeTruthy();
    await fireEvent.press(screen.getByText('Keep and continue'));
    expect(onConfirm).toHaveBeenCalledWith(['s0', 's1']);
  });

  it('shows the database message if saving fails', async () => {
    await render(<KeepListings plan="Starter" limit={1} listings={listings} onCancel={() => {}} onConfirm={async () => 'Please choose 1 listing(s) to keep.'} />);
    await fireEvent.press(screen.getByText('Photography'));
    await fireEvent.press(screen.getByText('Keep and continue'));
    expect(await screen.findByText('Please choose 1 listing(s) to keep.')).toBeTruthy();
  });
});
