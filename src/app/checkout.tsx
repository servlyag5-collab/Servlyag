import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/Menu';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type T = { id: string; name: string; monthly_price: number; booking_included: boolean };
const PAY_URL = process.env.EXPO_PUBLIC_PAY_URL; // your payment provider's page (set once you pick a provider)

// Order summary for the plan chosen on the Plan screen, then on to the payment page.
export default function Checkout() {
  const { tier, booking, next } = useLocalSearchParams<{ tier: string; booking?: string; next?: string }>();
  const session = useSession();
  const [t, setT] = useState<T | null>(null);
  const [addon, setAddon] = useState(25);

  useEffect(() => {
    supabase.from('tiers').select('id,name,monthly_price,booking_included').eq('id', tier).single().then(({ data }) => setT(data as T));
    supabase.from('addons').select('monthly_price').eq('id', 'booking').single().then(({ data }) => { if (data) setAddon(data.monthly_price); });
  }, [tier]);

  const withBooking = !!t && !t.booking_included && booking === '1';
  const total = (t?.monthly_price ?? 0) + (withBooking ? addon : 0);
  const line = (label: string, amount: string, bold = false) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 16, color: colors.ink, fontWeight: bold ? '800' : '400' }}>{label}</Text>
      <Text style={{ fontSize: 16, color: colors.ink, fontWeight: bold ? '800' : '400' }}>{amount}</Text>
    </View>
  );

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        <Text style={ui.h1}>Checkout</Text>
        {!t ? <ActivityIndicator color={colors.blue} /> : (
          <>
            <View style={ui.card}>
              <Text style={ui.h2}>Your order</Text>
              {line(`${t.name} plan`, `${t.monthly_price} XCD`)}
              {t.booking_included && line('Booking app', 'included')}
              {withBooking && line('Booking app add-on', `${addon} XCD`)}
              <View style={{ height: 1, backgroundColor: colors.border }} />
              {line('Total per month', `${total} XCD`, true)}
              <Text style={ui.muted}>Your listings go live as soon as your payment is confirmed. Each payment covers one month.</Text>
              {/* Shown before paying, as banks and the stores expect: renewal, how to cancel, refunds. */}
              <Text style={[ui.muted, { fontSize: 14, lineHeight: 20 }]}>
                Renews every month until you cancel (Contact support). No refund once a month has started.{' '}
                <Text style={{ color: colors.blue, fontWeight: '700', textDecorationLine: 'underline' }} onPress={() => router.push('/refunds' as Href)}>
                  Refund and Cancellation Policy
                </Text>
              </Text>
            </View>
            {PAY_URL ? (
              <Pressable style={[ui.btn, ui.primary]}
                onPress={() => Linking.openURL(`${PAY_URL}?merchant=${session?.user.id}&tier=${t.id}&booking=${withBooking ? 1 : 0}&amount=${total}`)}>
                <Text style={[ui.btnText, { color: '#fff' }]}>Pay {total} XCD</Text>
              </Pressable>
            ) : (
              <View style={[ui.card, { borderColor: colors.gold, borderWidth: 2 }]}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Online payment is not connected yet</Text>
                <Text style={ui.muted}>Your choice has been saved. Servly will contact you to complete payment.</Text>
              </View>
            )}
            {next === 'offer' && (
              <Pressable style={[ui.btn, ui.outline]} onPress={() => router.replace('/offer')}>
                <Text style={[ui.btnText, { color: colors.ink }]}>Continue: create your listing</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
