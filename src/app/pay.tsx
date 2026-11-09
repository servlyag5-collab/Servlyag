import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/Menu';
import { PinLoader } from '../components/PinLoader';
import { colors, ui } from '../lib/theme';

const FN = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/payment-start`;

// The website page that hands the merchant to CyberSource's secure payment page (ACB). Checkout opens it
// with a one-time link (order + secret); it gets the signed payment form from Servly's server and sends
// it straight on. Card details are only ever typed on CyberSource's page, never in Servly.
export default function Pay() {
  const { order, s } = useLocalSearchParams<{ order: string; s: string }>();
  const [error, setError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') { setError('Please open this payment link in your web browser.'); return; }
    if (!order || !s) { setError('This payment link is not complete. Please press Pay again.'); return; }
    // Coming BACK from the payment page: don't send them straight there again (that looped).
    const sentKey = `servly.pay.sent.${order}`;
    try {
      if (sessionStorage.getItem(sentKey)) { setError('You left the payment page before paying. Press Pay on Checkout to start again.'); return; }
    } catch { /* storage blocked: carry on */ }
    let gone = false;
    (async () => {
      try {
        const res = await fetch(`${FN}?order=${encodeURIComponent(order)}&s=${encodeURIComponent(s)}`);
        const body = await res.json();
        if (gone) return;
        if (!res.ok || !body.action) { setError(body.error ?? 'The payment page could not be opened.'); return; }
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = body.action;
        for (const [name, value] of Object.entries(body.fields as Record<string, string>)) {
          const input = document.createElement('input');
          input.type = 'hidden'; input.name = name; input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        try { sessionStorage.setItem(sentKey, '1'); } catch { /* ignore */ }
        form.submit();
      } catch {
        if (!gone) setError('Servly could not reach the payment service. Check your internet and try again.');
      }
    })();
    return () => { gone = true; };
  }, [order, s]);

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        {error ? (
          <View style={[ui.card, { borderColor: colors.red, borderWidth: 2, gap: 8 }]}>
            <Text style={ui.h2}>Payment page not opened</Text>
            <Text style={ui.muted}>{error}</Text>
            <Text style={ui.muted}>Nothing was charged.</Text>
            <Pressable style={[ui.btn, ui.outline]} onPress={() => router.replace('/plan' as Href)}>
              <Text style={[ui.btnText, { color: colors.ink }]}>Back to plans</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <PinLoader size={40} />
            <Text style={[ui.muted, { textAlign: 'center' }]}>Taking you to the secure payment page…</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
