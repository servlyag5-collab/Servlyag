import { supabase } from './supabase';

// Founding Merchant free trials (v22): free time the owner gives from Admin, with no payment or receipt.
// When my running free trial ends, or null (no trial, trial over, or the v22 database update not run yet).
export async function myTrialEnd(uid: string): Promise<string | null> {
  const { data } = await supabase.from('free_trials').select('ends_at').eq('merchant_id', uid)
    .gt('ends_at', new Date().toISOString()).maybeSingle();
  return (data?.ends_at as string | undefined) ?? null;
}

// "Growth · free trial until 31/01/2027", plus the paid time after it when they already paid.
export function planStatus(tierName: string | undefined, expires: string, trialEnd: string | null): string {
  const day = (d: string) => new Date(d).toLocaleDateString();
  if (!trialEnd) return `${tierName} · active until ${day(expires)}`;
  const paidAfter = new Date(expires).getTime() > new Date(trialEnd).getTime();
  return `${tierName} · free trial until ${day(trialEnd)}${paidAfter ? `, then paid until ${day(expires)}` : ''}`;
}
