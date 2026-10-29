jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import { render, screen } from '@testing-library/react-native';
import { LegalLinks } from '../src/components/LegalLinks';

describe('Legal links', () => {
  it('phone apps: guests and customers see Terms and Privacy only', async () => {
    await render(<LegalLinks />); // tests run as a phone (not the website)
    expect(screen.getByText('Terms of Service')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
    expect(screen.queryByText('Refund Policy')).toBeNull();
  });

  it('merchants (and the website) also see the Refund Policy', async () => {
    await render(<LegalLinks refund />);
    expect(screen.getByText('Refund Policy')).toBeTruthy();
  });
});
