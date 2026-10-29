import { CENTRE, cleanFocus, focusOf, position } from '../src/lib/focus';

describe('Photo focus points', () => {
  it('reads a saved focus, and falls back to the centre', () => {
    const map = { 'a.jpg': { x: 0.2, y: 0.9 }, 'bad.jpg': { x: 'left' }, 'big.jpg': { x: 7, y: -3 } };
    expect(focusOf(map, 'a.jpg')).toEqual({ x: 0.2, y: 0.9 });
    expect(focusOf(map, 'missing.jpg')).toEqual(CENTRE);
    expect(focusOf(map, 'bad.jpg')).toEqual(CENTRE);
    expect(focusOf(map, 'big.jpg')).toEqual({ x: 1, y: 0 });
    expect(focusOf(null, 'a.jpg')).toEqual(CENTRE);
  });

  it('turns a focus into an image position', () => {
    expect(position({ x: 0.25, y: 1 })).toEqual({ left: '25%', top: '100%' });
  });

  it('keeps only photos still on the listing', () => {
    expect(cleanFocus({ 'a.jpg': { x: 0.12345, y: 0.5 }, 'gone.jpg': CENTRE }, ['a.jpg', 'b.jpg'])).toEqual({ 'a.jpg': { x: 0.123, y: 0.5 } });
  });
});
