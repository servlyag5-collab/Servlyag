import { useEffect, useState } from 'react';
import { antigua, clock } from './bookings';

// Opening hours for a listing: one time range per day, in Antigua time.
// A closing time earlier than (or equal to midnight after) the opening time means "after midnight".
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type DayHours = { open: boolean; from: string; to: string };
export type Hours = Record<DayKey, DayHours>;

export const DAYS: { key: DayKey; short: string; long: string }[] = [
  { key: 'mon', short: 'Mon', long: 'Monday' }, { key: 'tue', short: 'Tue', long: 'Tuesday' },
  { key: 'wed', short: 'Wed', long: 'Wednesday' }, { key: 'thu', short: 'Thu', long: 'Thursday' },
  { key: 'fri', short: 'Fri', long: 'Friday' }, { key: 'sat', short: 'Sat', long: 'Saturday' },
  { key: 'sun', short: 'Sun', long: 'Sunday' },
];
const KEY_BY_WEEKDAY: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']; // JavaScript weekday 0 = Sunday

// The week a merchant starts from when they switch opening hours on. Change the defaults here.
export const DEFAULT_HOURS: Hours = {
  mon: { open: true, from: '09:00', to: '17:00' }, tue: { open: true, from: '09:00', to: '17:00' },
  wed: { open: true, from: '09:00', to: '17:00' }, thu: { open: true, from: '09:00', to: '17:00' },
  fri: { open: true, from: '09:00', to: '17:00' }, sat: { open: true, from: '09:00', to: '13:00' },
  sun: { open: false, from: '09:00', to: '17:00' },
};

// Every half hour of the day, "00:00" to "23:30".
export const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

const minutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
// "9:00 AM"; a closing time of 00:00 reads "midnight".
export function timeLabel(t: string, closing = false) {
  if (closing && t === '00:00') return 'midnight';
  const m = minutes(t);
  return clock(Math.floor(m / 60), m % 60);
}

// Whatever is saved (or nothing) -> a complete week.
export function normalizeHours(raw: unknown): Hours {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<DayKey, Partial<DayHours>>>;
  const out = {} as Hours;
  for (const { key } of DAYS) {
    const d = src[key] ?? {};
    out[key] = {
      open: typeof d.open === 'boolean' ? d.open : DEFAULT_HOURS[key].open,
      from: TIMES.includes(d.from ?? '') ? d.from! : DEFAULT_HOURS[key].from,
      to: TIMES.includes(d.to ?? '') ? d.to! : DEFAULT_HOURS[key].to,
    };
  }
  return out;
}

// A problem to show the merchant before saving, or null if the week is fine.
export function hoursProblem(h: Hours): string | null {
  if (!DAYS.some((d) => h[d.key].open)) return 'Opening hours: mark at least one day as open, or switch opening hours off.';
  for (const d of DAYS) if (h[d.key].open && h[d.key].from === h[d.key].to) return `${d.long}: the opening and closing times are the same.`;
  return null;
}

export const todayKey = (now = new Date()) => KEY_BY_WEEKDAY[antigua(now).wd];

// "Open now · closes at 5:00 PM" / "Closed now · opens at 9:00 AM tomorrow", in Antigua time.
export function openStatus(h: Hours, now = new Date()): { open: boolean; label: string } {
  const a = antigua(now);
  const nowMin = a.h * 60 + a.min;
  const today = h[KEY_BY_WEEKDAY[a.wd]];
  const yesterday = h[KEY_BY_WEEKDAY[(a.wd + 6) % 7]];

  // Still open from last night (e.g. 8 PM - 2 AM).
  if (yesterday.open && minutes(yesterday.to) <= minutes(yesterday.from) && nowMin < minutes(yesterday.to)) {
    return { open: true, label: `Open now · closes at ${timeLabel(yesterday.to, true)}` };
  }
  if (today.open) {
    const from = minutes(today.from);
    const to = minutes(today.to);
    const overnight = to <= from;
    if (nowMin >= from && (overnight || nowMin < to)) return { open: true, label: `Open now · closes at ${timeLabel(today.to, true)}` };
    if (nowMin < from) return { open: false, label: `Closed now · opens at ${timeLabel(today.from)} today` };
  }
  for (let i = 1; i <= 7; i++) {
    const key = KEY_BY_WEEKDAY[(a.wd + i) % 7];
    if (h[key].open) {
      const when = i === 1 ? 'tomorrow' : DAYS.find((d) => d.key === key)!.long;
      return { open: false, label: `Closed now · opens at ${timeLabel(h[key].from)} ${when}` };
    }
  }
  return { open: false, label: 'Closed' };
}

// The current time, refreshed every minute, so "Open" / "Closed now" changes by itself
// (for example at closing time) on screens that stay open, like Home.
export function useNow(everyMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
