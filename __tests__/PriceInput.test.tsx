import { fireEvent, render, screen } from '@testing-library/react-native';
import { PriceInput } from '../src/components/PriceInput';

// The price box tells merchants exactly what customers will see.
describe('PriceInput', () => {
  it('shows a fixed price', async () => {
    await render(<PriceInput value="30" onChange={() => {}} from={false} onFromChange={() => {}} />);
    expect(screen.getByText(/Customers will see "EC\$30"/)).toBeTruthy();
  });
  it('shows a starting price when From is on', async () => {
    await render(<PriceInput value="500" onChange={() => {}} from onFromChange={() => {}} />);
    expect(screen.getByText(/Customers will see "From EC\$500"/)).toBeTruthy();
  });
  it('switches From when tapped', async () => {
    const onFromChange = jest.fn();
    await render(<PriceInput value="500" onChange={() => {}} from={false} onFromChange={onFromChange} />);
    await fireEvent.press(screen.getByLabelText('Starting price (From)'));
    expect(onFromChange).toHaveBeenCalledWith(true);
  });
});
