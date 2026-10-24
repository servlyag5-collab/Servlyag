import { supabase } from './supabase';
import { colors } from './theme';

// The booking app. Times are always shown in Antigua time (UTC-4 all year, no daylight saving),
// whatever time zone the phone is set to.
export type Booking = {
  id: string; conversation_id: string; service_id: string; merchant_id: string; customer_id: string;
  starts_at: string; note: string; price: number | null;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  responded_at: string | null; cancelled_at: string | null; created_at: string;
};

const OFFSET_H = 4; // Antigua = UTC minus 4 hours
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// A moment as Antigua calendar parts.
export function antigua(iso: string | Date) {
  const t = new Date(new Date(iso).getTime() - OFFSET_H * 3600_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), h: t.getUTCHours(), min: t.getUTCMinutes(), wd: t.getUTCDay() };
}
// Antigua date + time -> the exact moment (ISO), for saving.
export const fromAntigua = (y: number, m: number, d: number, h: number, min: number) =>
  new Date(Date.UTC(y, m, d, h + OFFSET_H, min)).toISOString();

export const clock = (h: number, min: number) => `${((h + 11) % 12) + 1}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
// "Monday 3 November 2026" and "Monday 3 November 2026, 2:00 PM"
export function bookingDay(iso: string) { const a = antigua(iso); return `${DAYS[a.wd]} ${a.d} ${MONTHS[a.m]} ${a.y}`; }
export function bookingWhen(iso: string) { const a = antigua(iso); return `${bookingDay(iso)}, ${clock(a.h, a.min)}`; }

export const isPast = (b: Booking) => new Date(b.starts_at).getTime() <= Date.now();

// Status label and colour, from the point of view of the person looking.
export function statusInfo(b: Booking, iAmMerchant: boolean) {
  if (b.status === 'pending') return isPast(b)
    ? { label: 'Expired', color: colors.muted }
    : { label: iAmMerchant ? 'Waiting for customer' : 'Please confirm', color: '#B07C00' };
  if (b.status === 'confirmed') return { label: isPast(b) ? 'Completed' : 'Confirmed', color: colors.blue };
  if (b.status === 'declined') return { label: 'Declined', color: colors.muted };
  return { label: 'Cancelled', color: colors.red };
}

export async function respondBooking(id: string, confirm: boolean) {
  const { error } = await supabase.rpc('respond_booking', { p_booking: id, p_confirm: confirm });
  if (error) throw new Error(error.message);
}
export async function cancelBooking(id: string) {
  const { error } = await supabase.rpc('cancel_booking', { p_booking: id });
  if (error) throw new Error(error.message);
}
// Whether the logged-in merchant has the booking app (Business tier, or the paid add-on).
export async function hasBookingApp() {
  const { data } = await supabase.rpc('has_booking_app');
  return !!data;
}
