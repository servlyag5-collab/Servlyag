import { Platform, type ViewInstance } from 'react-native';

export type Box = { x: number; y: number; w: number; h: number };

// Where `target` sits inside `root` (or inside the whole screen when root is null), for the guides' gold outlines.
// Website: measured with the browser's own on-screen boxes and scaled into the page's units, so it stays right when
// a phone's browser has its page zoom or text size turned up (found 2026-11-24: on such a phone the outlines landed
// far from the parts they should light up, because measureInWindow ignores that zoom).
export function measureWithin(target: ViewInstance, root: ViewInstance | null, then: (b: Box) => void) {
  if (Platform.OS === 'web') {
    const t = target as unknown as HTMLElement;
    const r = (root as unknown as HTMLElement | null) ?? document.body;
    const tb = t.getBoundingClientRect(), rb = r.getBoundingClientRect();
    const s = rb.width > 0 && r.offsetWidth > 0 ? r.offsetWidth / rb.width : 1; // screen px -> page units
    const ox = root ? rb.left : 0, oy = root ? rb.top : 0;
    then({ x: (tb.left - ox) * s, y: (tb.top - oy) * s, w: tb.width * s, h: tb.height * s });
    return;
  }
  if (!root) { target.measureInWindow((x, y, w, h) => then({ x, y, w, h })); return; }
  // Phones: where both sit on the screen, then the part's place inside root.
  // (measureLayout ignores how far Home is scrolled on Android, so the outline landed too low there.)
  root.measureInWindow((rx, ry) => {
    target.measureInWindow((x, y, w, h) => then({ x: x - rx, y: y - ry, w, h }));
  });
}
