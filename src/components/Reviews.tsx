import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { canReview, type Rating, type Review } from '../lib/reviews';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';
import { RatingSummary, Stars } from './Stars';

// Reviews for ONE listing (pass serviceId, e.g. on the listing page) or for a whole business
// (pass only merchantId, e.g. the business profile; each review then says which listing it's about).
// `limit` shows the newest few with a "See all" link; `allowWrite` is off in the owner's preview.
export function Reviews({ merchantId, serviceId, limit, allowWrite = true }: {
  merchantId: string; serviceId?: string; limit?: number; allowWrite?: boolean;
}) {
  const session = useSession();
  const uid = session?.user.id;
  const [rating, setRating] = useState<Rating | undefined>();
  const [rows, setRows] = useState<Review[] | null>(null);
  const [err, setErr] = useState('');
  const [mine, setMine] = useState<boolean | null>(null); // null = can't review, false = can write, true = can edit

  useFocusEffect(useCallback(() => {
    let q = supabase.from('reviews').select('*,customer:profiles!customer_id(display_name),services(title)').order('created_at', { ascending: false });
    q = serviceId ? q.eq('service_id', serviceId) : q.eq('merchant_id', merchantId);
    if (limit) q = q.limit(limit);
    q.then(({ data, error }) => { setErr(error?.message ?? ''); setRows((data as unknown as Review[]) ?? []); });
    (serviceId
      ? supabase.from('service_ratings').select('average,total').eq('service_id', serviceId).maybeSingle()
      : supabase.from('merchant_ratings').select('average,total').eq('merchant_id', merchantId).maybeSingle()
    ).then(({ data }) => setRating(data ? { average: Number(data.average), total: data.total } : undefined));
    // Writing is per listing, so the button only appears on a listing's own reviews.
    if (uid && serviceId && allowWrite && uid !== merchantId) {
      Promise.all([
        canReview(serviceId, uid),
        supabase.from('reviews').select('id').eq('service_id', serviceId).eq('customer_id', uid).maybeSingle(),
      ]).then(([ok, r]) => setMine(r.data ? true : ok ? false : null));
    } else setMine(null);
  }, [merchantId, serviceId, uid, limit, allowWrite]));

  const total = rating?.total ?? 0;
  return (
    <View style={{ gap: 10 }}>
      <Text style={[ui.h2, { marginTop: 8 }]}>Reviews</Text>
      {!!err && <Text style={ui.error}>{err}</Text>}
      {total > 0 ? <RatingSummary rating={rating} size={18} /> : rows && !err && <Text style={ui.muted}>No reviews yet.</Text>}
      {!rows && <ActivityIndicator color={colors.blue} />}
      {rows?.map((r) => (
        <View key={r.id} style={[ui.card, { padding: 14, gap: 6 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ flex: 1, fontWeight: '800', fontSize: 16, color: colors.ink }} numberOfLines={1}>
              {r.customer_id === uid ? 'You' : r.customer?.display_name || 'Customer'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{new Date(r.updated_at).toLocaleDateString()}</Text>
          </View>
          <Stars value={r.rating} size={16} />
          {!serviceId && !!r.services?.title && <Text style={{ fontSize: 13, fontWeight: '700', color: colors.blue }}>About: {r.services.title}</Text>}
          {!!r.comment && <Text style={[ui.muted, { color: colors.ink }]}>{r.comment}</Text>}
        </View>
      ))}
      {!!limit && total > limit && (
        <Pressable onPress={() => router.push({ pathname: '/reviews/[merchantId]', params: serviceId ? { merchantId, service: serviceId } : { merchantId } })}>
          <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>See all {total} reviews</Text>
        </Pressable>
      )}
      {mine !== null && serviceId && (
        <Pressable style={[ui.btn, ui.outline]} onPress={() => router.push({ pathname: '/review/[serviceId]', params: { serviceId } })}>
          <Text style={[ui.btnText, { color: colors.ink }]}>{mine ? 'Edit your review' : 'Write a review'}</Text>
        </Pressable>
      )}
    </View>
  );
}
