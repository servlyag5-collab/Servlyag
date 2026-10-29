import { splitRows } from '../src/lib/rows';

// priority: Business 2, Growth 1, Starter 0
const B = (n: number) => ({ id: `b${n}`, priority: 2 });
const G = (n: number) => ({ id: `g${n}`, priority: 1 });
const S = (n: number) => ({ id: `s${n}`, priority: 0 });
const show = (rows: { priority: number; id: string }[]) => splitRows(rows).map((r) => `${r.title}: ${r.list.map((x) => x.id).join(' ')}`);

describe('Home rows: Popular picks = highest plan in the results', () => {
  it('all three plans: Business on top; Growth then Starter below', () => {
    expect(show([B(1), B(2), G(1), S(1), S(2)])).toEqual(['Popular picks: b1 b2', 'More local services: g1 s1 s2']);
  });
  it('no Business: Growth moves up to Popular picks', () => {
    expect(show([G(1), G(2), S(1)])).toEqual(['Popular picks: g1 g2', 'More local services: s1']);
  });
  it('only Starter: everything is Popular picks, no empty row', () => {
    expect(show([S(1), S(2)])).toEqual(['Popular picks: s1 s2']);
  });
  it('Business and Starter only', () => {
    expect(show([B(1), S(1)])).toEqual(['Popular picks: b1', 'More local services: s1']);
  });
  it('no results: no rows', () => {
    expect(show([])).toEqual([]);
  });
});
