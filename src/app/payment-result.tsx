import { useEffect, useRef } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/Menu';
import { WideSplit } from '../components/WideSplit';
import { useSession } from '../lib/session';
import { colors, ui } from '../lib/theme';
import { PinLoader } from '../components/PinLoader';

// Where CyberSource's payment page sends the browser (via the payment-return function), on the website.
// - Logged in on this website: straight on to Account, which shows how the payment went at the top.
// - Not logged in here (the merchant paid from the phone app, so the payment opened in the phone's browser):
//   say how it went and open the Servly app on Account, with a button in case the phone doesn't switch by itself.
const WORDS: Record<string, { title: string; body: string; color: string }> = {
  paid: { title: 'Payment received', body: 'Thank you! Your plan is on. Your receipt is on your Account page in the Servly app.', color: colors.blue },
  pending: { title: 'Checking your payment', body: 'The bank is still confirming your payment. Open the Servly app to see when it is done.', color: colors.gold },
  declined: { title: "The payment didn't go through", body: 'Your card was not charged. Go back to the Servly app to try another card.', color: colors.red },
  cancelled: { title: 'Payment cancelled', body: 'Nothing was charged. You can choose a plan in the Servly app whenever you are ready.', color: colors.muted },
  error: { title: 'Something went wrong', body: "We couldn't confirm this payment. If money was taken from your card, contact Servly support and we'll sort it out.", color: colors.red },
};
const onPhoneBrowser = () => Platform.OS === 'web' && typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export default function PaymentResult() {
  const session = useSession();
  const { status, order } = useLocalSearchParams<{ status?: string; order?: string }>();
  const q = new URLSearchParams({ payment: status ?? 'error', ...(order ? { order } : {}) }).toString();
  const appLink = `servlyag://account?${q}`;
  const tried = useRef(false);

  // Not logged in on a phone's browser: hand over to the Servly app once.
  useEffect(() => {
    if (session === null && onPhoneBrowser() && !tried.current) { tried.current = true; window.location.href = appLink; }
  }, [session, appLink]);

  if (session === undefined) return <PinLoader size={60} />;
  if (session) return <Redirect href={`/account?${q}` as Href} />;

  const w = WORDS[status ?? ''] ?? WORDS.error;
  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        <WideSplit>
          <View style={[ui.card, { borderColor: w.color, borderWidth: 2, gap: 10 }]} accessibilityLiveRegion="polite">
            <Text style={ui.h2}>{w.title}</Text>
            <Text style={ui.muted}>{w.body}</Text>
            {onPhoneBrowser() && (
              <Pressable style={[ui.btn, ui.primary]} onPress={() => Linking.openURL(appLink)}>
                <Text style={[ui.btnText, { color: '#fff' }]}>Open the Servly app</Text>
              </Pressable>
            )}
            <Pressable style={[ui.btn, ui.outline]} onPress={() => router.push({ pathname: '/login', params: { mode: 'in' } })}>
              <Text style={[ui.btnText, { color: colors.ink }]}>Log in on the website</Text>
            </Pressable>
          </View>
        </WideSplit>
      </ScrollView>
    </SafeAreaView>
  );
}
