jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null })); // icon fonts can't load in tests
jest.setTimeout(20000);

import { fireEvent, render, screen } from '@testing-library/react-native';
import { PhotoViewer } from '../src/components/PhotoViewer';

describe('Full-screen photos', () => {
  const urls = ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg'];

  it('opens on the tapped photo and closes with ×', async () => {
    const onClose = jest.fn();
    await render(<PhotoViewer urls={urls} start={1} onClose={onClose} />);
    expect(screen.getByText('2 of 3')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Close photos'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows nothing while closed', async () => {
    await render(<PhotoViewer urls={urls} start={null} onClose={() => {}} />);
    expect(screen.queryByText(/of 3/)).toBeNull();
  });
});
