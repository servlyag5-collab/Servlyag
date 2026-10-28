import { supabase } from './supabase';

// Reviews: 1-5 stars + optional comment about one LISTING. One per customer per listing (enforced
// by the database); only customers who messaged about that listing can review it.
export type Rating = { average: number; total: number };
export type Review = {
  id: string; merchant_id: string; service_id: string | null; customer_id: string; rating: number; comment: string;
  created_at: string; updated_at: string; reply: string | null; replied_at: string | null; as_business: boolean;
  customer: { display_name: string; screen_name: string } | null; services: { title: string } | null;
};

// Average stars and count for several listings at once (e.g. the Home rows), keyed by listing id.
export async function fetchListingRatings(serviceIds: string[]): Promise<Record<string, Rating>> {
  const ids = [...new Set(serviceIds)];
  if (!ids.length) return {};
  const { data } = await supabase.from('service_ratings').select('service_id,average,total').in('service_id', ids);
  const out: Record<string, Rating> = {};
  for (const r of (data as { service_id: string; average: number; total: number }[]) ?? []) out[r.service_id] = { average: Number(r.average), total: r.total };
  return out;
}

// Only real customers can review a listing: someone who has messaged about it (and isn't its owner).
export async function canReview(serviceId: string, uid: string) {
  const { count } = await supabase.from('conversations').select('id', { count: 'exact', head: true })
    .eq('customer_id', uid).eq('service_id', serviceId).neq('last_message', '');
  return (count ?? 0) > 0;
}
