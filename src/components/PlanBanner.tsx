import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { bookingDay } from '../lib/bookings';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

const WARN_DAYS = 5; // start warning this many days before a plan ends

// Warns merchants (people with listings) when their plan is about to end, or has ended.
export function PlanBanner() {
  const session = useSession();
  const uid = session?.user.id;
  const [state, setState] = useState<{ ends: string | null; days: number; hasListings: boolean } | null>(null);

  useFocusEffect(useCallback(() => {
    if (!uid) return setState(null);
    Promise.all([
      supabase.from('profiles').select('plan_expires_at').eq('id', uid).maybeSingle(),
      supabase.from('services').select('id', { count: 'exact', head: true }).eq('merchant_id', uid),
    ]).then(([p, c]) => {
      const ends = (p.data?.plan_expires_at as string | null) ?? null;
      const days = ends ? Math.ceil((new Date(ends).getTime() - Date.now()) / 86_400_000) : -1;
      setState({ ends, days, hasListings: (c.count ?? 0) > 0 });
    });
  }, [uid]));

  if (!state?.hasListings) return null;
  const expired = !state.ends || state.days <= 0;
  if (!expired && state.days > WARN_DAYS) return null;

  const text = expired
    ? 'Your plan has ended, so customers can\'t see your listings.'
    : `Your plan ends on ${bookingDay(state.ends!)} (in ${state.days} day${state.days === 1 ? '' : 's'}). Renew to keep your listings visible.`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 2,
      borderColor: expired ? colors.red : colors.gold, backgroundColor: expired ? '#FDECEE' : '#FFFBEA' }}>
      <Text style={{ flex: 1, color: colors.ink, fontWeight: '700', lineHeight: 21 }}>{text}</Text>
      <Pressable onPress={() => router.push('/plan')} style={{ backgroundColor: colors.blue, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>Renew</Text>
      </Pressable>
    </View>
  );
}
