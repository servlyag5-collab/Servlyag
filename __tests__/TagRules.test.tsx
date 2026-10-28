jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null })); // icon fonts can't load in tests
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { fireEvent, render, screen } from '@testing-library/react-native';
import { TagRules } from '../src/components/TagRules';
import { TERMS } from '../src/lib/legal';

describe('Tag rules (Offer a service / Edit listing)', () => {
  it('opens the rules with the penalty, and closes', async () => {
    await render(<TagRules />);
    expect(screen.queryByText('Breaking these rules has penalties')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Tag rules'));
    expect(screen.getByText('Breaking these rules has penalties')).toBeTruthy();
    expect(screen.getByText(/hidden, suspended or removed/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Got it'));
    expect(screen.queryByText('Breaking these rules has penalties')).toBeNull();
  });

  it('is backed by the Terms of Service', () => {
    const rules = TERMS.find((s) => s.heading === 'What is not allowed')!.body.join(' ');
    expect(rules).toMatch(/unrelated tags/);
  });
});
