jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null })); // icon fonts can't load in tests

import { fireEvent, render, screen } from '@testing-library/react-native';
import { PasswordInput } from '../src/components/PasswordInput';

describe('Password box', () => {
  it('hides the password until the eye is tapped, then hides it again', async () => {
    await render(<PasswordInput placeholder="Password" value="secret1" />);
    const box = screen.getByPlaceholderText('Password');
    expect(box.props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByLabelText('Show password'));
    expect(screen.getByPlaceholderText('Password').props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByLabelText('Hide password'));
    expect(screen.getByPlaceholderText('Password').props.secureTextEntry).toBe(true);
  });
});
