jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null })); // icon fonts can't load in tests
jest.setTimeout(20000);

import { Image } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PhotoFramer } from '../src/components/PhotoFramer';

describe('Position photo (Offer / Edit listing)', () => {
  // A tall photo (like a portrait), so there is room to drag up and down.
  beforeEach(() => { jest.spyOn(Image, 'getSize').mockImplementation((_uri, ok) => ok!(1000, 2000)); });

  it('keeps the chosen spot, and Centre resets it', async () => {
    const onDone = jest.fn();
    await render(<PhotoFramer uri="file://tall.jpg" focus={{ x: 0.5, y: 0.2 }} onDone={onDone} onClose={() => {}} />);
    expect(screen.getByText(/Drag the photo/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Use this'));
    expect(onDone).toHaveBeenLastCalledWith({ x: 0.5, y: 0.2 });
    await fireEvent.press(screen.getByText('Centre'));
    await fireEvent.press(screen.getByText('Use this'));
    expect(onDone).toHaveBeenLastCalledWith({ x: 0.5, y: 0.5 });
  });

  it('Cancel closes without changing anything', async () => {
    const onDone = jest.fn(); const onClose = jest.fn();
    await render(<PhotoFramer uri="file://tall.jpg" focus={{ x: 0.5, y: 0.5 }} onDone={onDone} onClose={onClose} />);
    await fireEvent.press(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
