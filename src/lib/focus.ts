import type { ImageContentPosition } from 'expo-image';

// Photo focus points (v18): which part of a photo shows when a card crops it.
// x and y run from 0 (left / top) to 1 (right / bottom); 0.5, 0.5 is the centre.
// Saved per listing in services.photo_focus as { [photo path]: { x, y } }.
export type Focus = { x: number; y: number };
export type FocusMap = Record<string, Focus>;
export const CENTRE: Focus = { x: 0.5, y: 0.5 };

const clamp01 = (n: unknown) => (typeof n === 'number' && isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);

// The focus for one photo; the centre when none was chosen or the saved value is broken.
export function focusOf(map: unknown, path: string | undefined): Focus {
  const f = path && map && typeof map === 'object' ? (map as Record<string, unknown>)[path] : null;
  if (!f || typeof f !== 'object') return CENTRE;
  const { x, y } = f as Record<string, unknown>;
  return { x: clamp01(x), y: clamp01(y) };
}

// For expo-image's contentPosition (works like CSS object-position).
export const position = (f: Focus): ImageContentPosition => ({ left: `${Math.round(f.x * 100)}%`, top: `${Math.round(f.y * 100)}%` });

// Keep only the photos still on the listing, rounded to keep the saved data small.
export function cleanFocus(map: FocusMap, paths: string[]): FocusMap {
  const out: FocusMap = {};
  for (const p of paths) if (map[p]) out[p] = { x: Math.round(map[p].x * 1000) / 1000, y: Math.round(map[p].y * 1000) / 1000 };
  return out;
}
