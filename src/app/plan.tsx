import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type T = { id: string; name: string; monthly_price: number; max_services: number | null; priority_rank: number; booking_included: boolean };
type Me = { id: string; tier_id: string; plan_expires_at: string | null; requested_tier: string | null };
const PAY_URL = process.env.EXPO_PUBLIC_PAY_URL; // your payment page (set once you pick a provider)

export default function Plan() {
  const [tiers, setTiers] = useState<T[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [addon, setAddon] = useState(25);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [t, p, a] = await Promise.all([
        supabase.from('tiers').select('*').order('monthly_price'),
        supabase.from('profiles').select('id,tier_id,plan_expires_at,requested_tier').eq('id', user!.id).single(),
        supabase.from('addons').select('monthly_price').eq('id', 'booking').single(),
      ]);
      setTiers((t.data as T[]) ?? []); setMe(p.data as Me); if (a.data) setAddon(a.data.monthly_price);
    })();
  }, []);

  async function choose(id: string) {
    if (!me) return;
    await supabase.from('profiles').update({ requested_tier: id }).eq('id', me.id);
    setMe({ ...me, requested_tier: id });
  }
  const active = !!me?.plan_expires_at && new Date(me.plan_expires_at) > new Date();
  const current = tiers.find((t) => t.id === me?.tier_id);

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>← Back</Text></Pressable>
        <Text style={ui.h1}>Your plan</Text>
        {!me ? <ActivityIndicator color={colors.blue} /> : (
          <>
            <Text style={{ fontSize: 16, color: active ? colors.blue : colors.red, fontWeight: '700' }}>
              {active ? `${current?.name} · active until ${new Date(me.plan_expires_at!).toLocaleDateString()}` : 'No active plan. Your listings are hidden from customers until you pay.'}
            </Text>
            {tiers.map((t) => (
              <View key={t.id} style={[ui.card, me.requested_tier === t.id && { borderColor: colors.blue, borderWidth: 2 }]}>
                <Text style={ui.h2}>{t.name} · {t.monthly_price} XCD / month</Text>
                <Text style={ui.muted}>Business profile, customer messaging and call</Text>
                <Text style={ui.muted}>{t.max_services ?? 'Unlimited'} service listing{t.max_services === 1 ? '' : 's'}</Text>
                {t.priority_rank > 0 && <Text style={ui.muted}>Priority placement in search</Text>}
                <Text style={ui.muted}>{t.booking_included ? 'Booking app included' : `Booking app add-on: ${addon} XCD / month`}</Text>
                {me.requested_tier === t.id ? (
                  PAY_URL ? (
                    <Pressable style={[ui.btn, ui.primary]} onPress={() => Linking.openURL(`${PAY_URL}?merchant=${me.id}&tier=${t.id}&amount=${t.monthly_price}`)}>
                      <Text style={[ui.btnText, { color: '#fff' }]}>Pay {t.monthly_price} XCD</Text>
                    </Pressable>
                  ) : <Text style={{ color: colors.blue, fontWeight: '700' }}>Request saved. We will contact you to complete payment.</Text>
                ) : (
                  <Pressable style={[ui.btn, ui.outline]} onPress={() => choose(t.id)}><Text style={[ui.btnText, { color: colors.ink }]}>Choose {t.name}</Text></Pressable>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
