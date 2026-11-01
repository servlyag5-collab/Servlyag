import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WideSplit } from '../components/WideSplit';
import { TopBar } from '../components/Menu';
import { promoDiscount, promoMonthsLeft, type Promo } from '../lib/promo';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';
import { PinLoader } from '../components/PinLoader';

type T = { id: string; name: string; monthly_price: number; booking_included: boolean };
const PAY_URL = process.env.EXPO_PUBLIC_PAY_URL; // your payment provider's page (set once you pick a provider)

// Order summary for the plan chosen on the Plan screen, then on to the payment page.
export default function Checkout() {
  const { tier, booking, next } = useLocalSearchParams<{ tier: string; booking?: string; next?: string }>();
  const session = useSession();
  const [t, setT] = useState<T | null>(null);
  const [addon, setAddon] = useState(25);
  const [promo, setPromo] = useState<Promo | null>(null); // my promo code, while it has discounted months left
  const [code, setCode] = useState('');
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoErr, setPromoErr] = useState('');

  useEffect(() => {
    supabase.from('tiers').select('id,name,monthly_price,booking_included').eq('id', tier).single().then(({ data }) => setT(data as T));
    supabase.from('addons').select('monthly_price').eq('id', 'booking').single().then(({ data }) => { if (data) setAddon(data.monthly_price); });
    supabase.rpc('my_promo').maybeSingle().then(({ data }) => setPromo((data as Promo | null) ?? null));
  }, [tier]);

  // Applying a code holds one of its places for 7 days; the database checks it's active and not used up.
  async function applyCode() {
    if (!code.trim()) return;
    setPromoBusy(true); setPromoErr('');
    const { data, error } = await supabase.rpc('apply_promo_code', { p_code: code.trim() }).maybeSingle();
    setPromoBusy(false);
    if (error) return setPromoErr(error.message);
    setPromo(data as Promo); setCode('');
  }
  async function removeCode() {
    await supabase.rpc('remove_my_promo');
    setPromo(null);
  }

  const withBooking = !!t && !t.booking_included && booking === '1';
  const discount = promoDiscount(t?.monthly_price ?? 0, promo);
  const fullTotal = (t?.monthly_price ?? 0) + (withBooking ? addon : 0);
  const total = fullTotal - discount;
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
        <WideSplit>
        <Text style={ui.h1}>Checkout</Text>
        {!t ? <PinLoader /> : (
          <>
            <View style={ui.card}>
              <Text style={ui.h2}>Your order</Text>
              {line(`${t.name} plan`, `${t.monthly_price} XCD`)}
              {t.booking_included && line('Bookings', 'included')}
              {withBooking && line('Bookings upgrade', `${addon} XCD`)}
              {!!promo && discount > 0 && line(`${promo.code} (${promo.percent_off}% off the plan)`, `−${discount} XCD`)}
              <View style={{ height: 1, backgroundColor: colors.border }} />
              {line('Total per month', `${total} XCD`, true)}
              {!!promo && discount > 0 && (
                <Text style={{ color: colors.blue, fontWeight: '700' }}>{total} XCD {promoMonthsLeft(promo)}, then {fullTotal} XCD per month.</Text>
              )}
              <Text style={ui.muted}>Your listings go live as soon as your payment is confirmed. Each payment covers one month.</Text>
              {/* Shown before paying, as banks and the stores expect: renewal, how to cancel, refunds. */}
              <Text style={[ui.muted, { fontSize: 14, lineHeight: 20 }]}>
                Renews every month until you cancel (Contact support). No refund once a month has started.{' '}
                <Text style={{ color: colors.blue, fontWeight: '700', textDecorationLine: 'underline' }} onPress={() => router.push('/refunds' as Href)}>
                  Refund and Cancellation Policy
                </Text>
              </Text>
            </View>
            {/* Promo code (e.g. LAUNCH50). Only when the merchant has no code with discounted months left. */}
            {promo ? (
              promo.months_used === 0 && (
                <View style={[ui.card, { borderColor: colors.gold, borderWidth: 2, gap: 6 }]}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Promo code {promo.code} applied</Text>
                  <Text style={ui.muted}>
                    Your place is held until {new Date(promo.hold_until).toLocaleDateString()}. Complete your payment before then, or the place goes to another business.
                  </Text>
                  <Pressable onPress={removeCode} style={{ alignSelf: 'flex-start' }}>
                    <Text style={{ color: colors.red, fontWeight: '700' }}>Remove code</Text>
                  </Pressable>
                </View>
              )
            ) : (
              <View style={[ui.card, { gap: 8 }]}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Have a promo code?</Text>
                <View style={ui.row}>
                  <TextInput style={[ui.field, { flex: 1, minWidth: 0 }]} placeholder="e.g. LAUNCH50" autoCapitalize="characters" autoCorrect={false}
                    value={code} onChangeText={(v) => { setCode(v); setPromoErr(''); }} onSubmitEditing={applyCode} />
                  <Pressable style={[ui.btn, ui.outline, { borderColor: colors.blue }]} onPress={applyCode} disabled={promoBusy || !code.trim()}>
                    {promoBusy ? <ActivityIndicator color={colors.blue} /> : <Text style={[ui.btnText, { color: colors.blue }]}>Apply</Text>}
                  </Pressable>
                </View>
                {!!promoErr && <Text style={ui.error}>{promoErr}</Text>}
              </View>
            )}
            {PAY_URL ? (
              <Pressable style={[ui.btn, ui.primary]}
                onPress={() => Linking.openURL(`${PAY_URL}?merchant=${session?.user.id}&tier=${t.id}&booking=${withBooking ? 1 : 0}&amount=${total}${promo && discount > 0 ? `&promo=${promo.code}` : ''}`)}>
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
        </WideSplit>
      </ScrollView>
    </SafeAreaView>
  );
}
