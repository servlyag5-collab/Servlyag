import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { canReview, type Rating, type Review } from '../lib/reviews';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';
import { RatingSummary, Stars } from './Stars';

// A merchant's reviews: average, count, the latest few, and a Write/Edit button for real customers.
// `limit` shows only the newest few with a "See all" link; `allowWrite` is off in the owner's preview.
export function Reviews({ merchantId, limit, allowWrite = true }: { merchantId: string; limit?: number; allowWrite?: boolean }) {
  const session = useSession();
  const uid = session?.user.id;
  const [rating, setRating] = useState<Rating | undefined>();
  const [rows, setRows] = useState<Review[] | null>(null);
  const [err, setErr] = useState('');
  const [mine, setMine] = useState<boolean | null>(null); // null = can't review, false = can write, true = can edit

  useFocusEffect(useCallback(() => {
    let q = supabase.from('reviews').select('*,customer:profiles!customer_id(display_name)')
      .eq('merchant_id', merchantId).order('created_at', { ascending: false });
    if (limit) q = q.limit(limit);
    q.then(({ data, error }) => { setErr(error?.message ?? ''); setRows((data as unknown as Review[]) ?? []); });
    supabase.from('merchant_ratings').select('average,total').eq('merchant_id', merchantId).maybeSingle()
      .then(({ data }) => setRating(data ? { average: Number(data.average), total: data.total } : undefined));
    if (uid && allowWrite) {
      Promise.all([
        canReview(merchantId, uid),
        supabase.from('reviews').select('id').eq('merchant_id', merchantId).eq('customer_id', uid).maybeSingle(),
      ]).then(([ok, r]) => setMine(r.data ? true : ok ? false : null));
    } else setMine(null);
  }, [merchantId, uid, limit, allowWrite]));

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
          {!!r.comment && <Text style={[ui.muted, { color: colors.ink }]}>{r.comment}</Text>}
        </View>
      ))}
      {!!limit && total > limit && (
        <Pressable onPress={() => router.push({ pathname: '/reviews/[merchantId]', params: { merchantId } })}>
          <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>See all {total} reviews</Text>
        </Pressable>
      )}
      {mine !== null && (
        <Pressable style={[ui.btn, ui.outline]} onPress={() => router.push({ pathname: '/review/[merchantId]', params: { merchantId } })}>
          <Text style={[ui.btnText, { color: colors.ink }]}>{mine ? 'Edit your review' : 'Write a review'}</Text>
        </Pressable>
      )}
    </View>
  );
}
