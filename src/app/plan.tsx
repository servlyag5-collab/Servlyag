import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/Menu';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type T = { id: string; name: string; monthly_price: number; max_services: number | null; priority_rank: number; booking_included: boolean };
type Me = { id: string; tier_id: string; plan_expires_at: string | null; requested_tier: string | null; booking_requested: boolean };

export default function Plan() {
  const { next } = useLocalSearchParams<{ next?: string }>(); // 'offer' when coming from Offer a service
  const [tiers, setTiers] = useState<T[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [addon, setAddon] = useState(25);
  const [loadErr, setLoadErr] = useState('');
  // Which plan card has "Add the booking app" ticked (only one at a time).
  const [bookingFor, setBookingFor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [t, p, a] = await Promise.all([
        supabase.from('tiers').select('*').order('monthly_price'),
        supabase.from('profiles').select('id,tier_id,plan_expires_at,requested_tier,booking_requested').eq('id', user!.id).single(),
        supabase.from('addons').select('monthly_price').eq('id', 'booking').single(),
      ]);
      if (!p.data) setLoadErr(p.error?.message ?? 'Could not load your plan.');
      const m = p.data as Me | null;
      setTiers((t.data as T[]) ?? []); setMe(m); if (a.data) setAddon(a.data.monthly_price);
      if (m?.booking_requested) setBookingFor(m.requested_tier ?? m.tier_id);
    })();
  }, []);

  const withBooking = (t: T) => !t.booking_included && bookingFor === t.id;

  // Choosing a plan goes straight to checkout. The choice is saved so you know what to activate after payment.
  async function choose(t: T) {
    if (!me) return;
    const booking = withBooking(t);
    await supabase.from('profiles').update({ requested_tier: t.id, booking_requested: booking }).eq('id', me.id);
    router.push({ pathname: '/checkout', params: { tier: t.id, booking: booking ? '1' : '0', ...(next ? { next } : {}) } });
  }

  const active = !!me?.plan_expires_at && new Date(me.plan_expires_at) > new Date();
  const current = tiers.find((t) => t.id === me?.tier_id);

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        <Text style={ui.h1}>{next === 'offer' ? 'Choose a plan to start selling' : 'Your plan'}</Text>
        {next === 'offer' && <Text style={ui.muted}>Your plan decides how many services you can list. You'll create your listing right after checkout.</Text>}
        {!me ? (loadErr ? <Text style={ui.error}>{loadErr}</Text> : <ActivityIndicator color={colors.blue} />) : (
          <>
            <Text style={{ fontSize: 16, color: active ? colors.blue : colors.red, fontWeight: '700' }}>
              {active ? `${current?.name} · active until ${new Date(me.plan_expires_at!).toLocaleDateString()}` : 'No active plan. Your listings are hidden from customers until you pay.'}
            </Text>
            {tiers.map((t) => {
              const isCurrent = active && me.tier_id === t.id;
              const price = t.monthly_price + (withBooking(t) ? addon : 0);
              return (
                <View key={t.id} style={[ui.card, isCurrent && { borderColor: colors.blue, borderWidth: 2 }]}>
                  {isCurrent && <Text style={{ color: colors.blue, fontWeight: '800', letterSpacing: 2, fontSize: 12 }}>YOUR CURRENT PLAN</Text>}
                  <Text style={ui.h2}>{t.name} · {t.monthly_price} XCD / month</Text>
                  <Text style={ui.muted}>Business profile, customer messaging and call</Text>
                  <Text style={ui.muted}>{t.max_services ?? 'Unlimited'} service listing{t.max_services === 1 ? '' : 's'}</Text>
                  {t.priority_rank > 0 && <Text style={ui.muted}>{t.priority_rank > 1 ? 'Top placement in search' : 'Priority placement in search'}</Text>}
                  {t.booking_included ? <Text style={ui.muted}>Booking app included</Text> : (
                    <Pressable style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }} onPress={() => setBookingFor(bookingFor === t.id ? null : t.id)}>
                      <Ionicons name={withBooking(t) ? 'checkbox' : 'square-outline'} size={26} color={colors.blue} />
                      <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>Add the booking app (+{addon} XCD / month)</Text>
                    </Pressable>
                  )}
                  <Pressable style={[ui.btn, ui.primary]} onPress={() => choose(t)}>
                    <Text style={[ui.btnText, { color: '#fff' }]}>{isCurrent ? 'Renew' : 'Choose'} {t.name} · {price} XCD</Text>
                  </Pressable>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
