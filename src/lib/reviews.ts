import { supabase } from './supabase';

// Reviews: 1-5 stars + optional comment, one per customer per merchant (enforced by the database).
export type Rating = { average: number; total: number };
export type Review = {
  id: string; merchant_id: string; customer_id: string; rating: number; comment: string;
  created_at: string; updated_at: string; customer: { display_name: string } | null;
};

// Average stars and count for several merchants at once (e.g. the search results).
export async function fetchRatings(merchantIds: string[]): Promise<Record<string, Rating>> {
  const ids = [...new Set(merchantIds)];
  if (!ids.length) return {};
  const { data } = await supabase.from('merchant_ratings').select('merchant_id,average,total').in('merchant_id', ids);
  const out: Record<string, Rating> = {};
  for (const r of (data as { merchant_id: string; average: number; total: number }[]) ?? []) out[r.merchant_id] = { average: Number(r.average), total: r.total };
  return out;
}

// Only real customers can review: someone who has messaged this merchant.
export async function canReview(merchantId: string, uid: string) {
  if (merchantId === uid) return false;
  const { count } = await supabase.from('conversations').select('id', { count: 'exact', head: true })
    .eq('customer_id', uid).eq('merchant_id', merchantId).neq('last_message', '');
  return (count ?? 0) > 0;
}
