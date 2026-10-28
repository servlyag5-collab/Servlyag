jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null })); // icon fonts can't load in tests

import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlacePicker } from '../src/components/PlacePicker';
import { PARISHES, VILLAGES } from '../src/lib/places';

describe('City and Village pickers', () => {
  it('lists the parishes and picks one', async () => {
    const onChange = jest.fn();
    await render(<PlacePicker label="City or parish" placeholder="City or parish" value="" onChange={onChange} options={PARISHES} />);
    await fireEvent.press(screen.getByText('City or parish'));
    expect(screen.getByText('St. Mary')).toBeTruthy();
    expect(screen.getByText('Barbuda')).toBeTruthy();
    await fireEvent.press(screen.getByText('St. Paul'));
    expect(onChange).toHaveBeenCalledWith('St. Paul');
  });

  it('searches villages, and can use a place that is not listed', async () => {
    const onChange = jest.fn();
    await render(<PlacePicker label="Village" placeholder="Village (optional)" value="" onChange={onChange} options={VILLAGES} />);
    await fireEvent.press(screen.getByText('Village (optional)'));
    await fireEvent.changeText(screen.getByPlaceholderText('Search or type a place'), 'liber');
    expect(screen.getByText('Liberta')).toBeTruthy();
    expect(screen.queryByText('Willikies')).toBeNull();
    await fireEvent.changeText(screen.getByPlaceholderText('Search or type a place'), 'Sea Breeze Heights');
    await fireEvent.press(screen.getByText('Use "Sea Breeze Heights"'));
    expect(onChange).toHaveBeenCalledWith('Sea Breeze Heights');
  });
});
