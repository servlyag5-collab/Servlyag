import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// ABST (Antigua and Barbuda Sales Tax), database v37. Added on top of the plan and bookings-upgrade prices, only
// while the owner has switched it on in Admin (it needs Servly's ABST registration number). The server works out
// the real amount charged (payment-start, renewal_price, activate_plan); this copy is for showing it.
export type AbstSettings = { on: boolean; rate: number; number: string | null };
export const ABST_OFF: AbstSettings = { on: false, rate: 17, number: null };

const cents = (x: number) => Math.round(x * 100) / 100;

// The ABST on an amount: 0 while ABST is off.
export function abstOf(net: number, s: AbstSettings) {
  return s.on && net > 0 ? cents((net * s.rate) / 100) : 0;
}

// "17%" (or "12.5%"): the rate as people read it.
export const ratePct = (s: AbstSettings) => `${Number(s.rate.toFixed(2))}%`;

// The current ABST setting (off until v37 is run and the owner switches it on).
export function useAbst() {
  const [s, setS] = useState<AbstSettings>(ABST_OFF);
  useEffect(() => {
    supabase.from('tax_settings').select('abst_on,abst_rate,abst_number').maybeSingle().then(({ data }) => {
      if (data) setS({ on: !!data.abst_on, rate: Number(data.abst_rate ?? 17), number: data.abst_number ?? null });
    });
  }, []);
  return s;
}
