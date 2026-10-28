jest.mock('../src/lib/supabase', () => ({ supabase: {} }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null })); // icon fonts can't load in tests

import { fireEvent, render, screen } from '@testing-library/react-native';
import { HoursCard } from '../src/components/HoursCard';
import { HoursEditor } from '../src/components/HoursEditor';
import { DEFAULT_HOURS } from '../src/lib/hours';

describe('HoursEditor (Offer a service / Edit listing)', () => {
  it('shows only the switch while opening hours are off', async () => {
    await render(<HoursEditor show={false} onShow={() => {}} hours={DEFAULT_HOURS} onChange={() => {}} />);
    expect(screen.getByText('Show opening hours')).toBeTruthy();
    expect(screen.queryByText('Mon')).toBeNull();
  });
  it('shows the week when switched on', async () => {
    await render(<HoursEditor show onShow={() => {}} hours={DEFAULT_HOURS} onChange={() => {}} />);
    for (const d of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) expect(screen.getByText(d)).toBeTruthy();
    expect(screen.getAllByText('9:00 AM').length).toBeGreaterThan(0);
    expect(screen.getByText('Closed')).toBeTruthy(); // Sunday
  });
  it('marks a day closed when its Open button is tapped', async () => {
    const onChange = jest.fn();
    await render(<HoursEditor show onShow={() => {}} hours={DEFAULT_HOURS} onChange={onChange} />);
    await fireEvent.press(screen.getByLabelText('Monday: open'));
    expect(onChange.mock.calls[0][0].mon.open).toBe(false);
  });
  it('copies Monday to Tuesday-Friday', async () => {
    const onChange = jest.fn();
    const hours = { ...DEFAULT_HOURS, mon: { open: true, from: '08:00', to: '18:00' } };
    await render(<HoursEditor show onShow={() => {}} hours={hours} onChange={onChange} />);
    await fireEvent.press(screen.getByText('Copy Monday to Tue–Fri'));
    const next = onChange.mock.calls[0][0];
    expect([next.tue, next.wed, next.thu, next.fri]).toEqual(Array(4).fill({ open: true, from: '08:00', to: '18:00' }));
    expect(next.sat).toEqual(DEFAULT_HOURS.sat);
  });
});

describe('HoursCard (listing page)', () => {
  it('lists the week with a live open/closed line', async () => {
    await render(<HoursCard hours={DEFAULT_HOURS} />);
    expect(screen.getByText('Opening hours')).toBeTruthy();
    expect(screen.getByText(/^(Open now|Closed now)/)).toBeTruthy();
    expect(screen.getByText(/\(today\)/)).toBeTruthy();
    expect(screen.getAllByText('9:00 AM – 5:00 PM').length).toBe(5);
  });
});
