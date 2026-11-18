import { supabase } from './supabase';

// Search insights (database v39): Home records each FINISHED search so the owner can see, in Admin > Searches,
// what people look for and what they couldn't find. Never who searched: only the words, parish, village and
// how many results came up. The database also refuses anything that looks like a phone number or email.
export const SETTLE_MS = 2500; // the words must stay unchanged this long to count as a finished search

export type SearchNote = { q: string; city: string; village: string; results: number };

export const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// Whether a search is worth recording: real words (2+ letters) or a parish/village, and no contact details.
export function worthLogging(n: SearchNote) {
  const q = normalise(n.q);
  if (q.length < 2 && !n.city.trim() && !n.village.trim()) return false;
  if (q.includes('@') || q.replace(/\D/g, '').length >= 7) return false;
  return true;
}

const keyOf = (n: SearchNote) => [normalise(n.q), normalise(n.city), normalise(n.village)].join('|');
let last = { key: '', at: 0 };

// Record one finished search (the same search again within 10 minutes counts once). Never blocks the screen.
export function noteSearch(n: SearchNote, now = Date.now()) {
  if (!worthLogging(n)) return false;
  const key = keyOf(n);
  if (key === last.key && now - last.at < 10 * 60 * 1000) return false;
  last = { key, at: now };
  supabase.rpc('log_search', { p_q: n.q, p_city: n.city, p_village: n.village, p_results: n.results })
    .then(() => {}, () => {}); // a failed note must never bother the person searching
  return true;
}

// For tests.
export function resetSearchLog() { last = { key: '', at: 0 }; }
