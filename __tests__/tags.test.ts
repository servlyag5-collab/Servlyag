import { MAX_TAGS, parseTags, tagsProblem } from '../src/lib/tags';

describe('search tags (up to 10 per listing)', () => {
  it('splits, trims, lowercases and drops repeats and blanks', () => {
    expect(parseTags('Photographer, events, , photographer ,  Wedding Photos')).toEqual(['photographer', 'events', 'wedding photos']);
  });
  it('allows exactly 10 tags', () => {
    const ten = Array.from({ length: MAX_TAGS }, (_, i) => `tag${i}`).join(', ');
    expect(tagsProblem(ten)).toBeNull();
  });
  it('refuses 11 tags with a clear message', () => {
    const eleven = Array.from({ length: MAX_TAGS + 1 }, (_, i) => `tag${i}`).join(', ');
    expect(tagsProblem(eleven)).toMatch(/up to 10 tags \(you have 11\)/);
  });
});
