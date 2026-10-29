import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold, useFonts } from '@expo-google-fonts/bricolage-grotesque';
import { StatusBar } from 'expo-status-bar';
import { Splash } from '../components/Splash';
import { registerForPush, useNotificationTaps } from '../lib/push';
import { useSession } from '../lib/session';
import { colors } from '../lib/theme';
import { PinLoader } from '../components/PinLoader';

let splashPlayed = false; // the opening animation plays once per app launch

// A password reset link that landed on another page (e.g. one sent from the Supabase dashboard goes to the
// Site URL home page): forward it, with its one-time code, to the Set a new password screen.
if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname !== '/reset-password'
    && /type=recovery/.test(window.location.hash)) {
  window.location.replace(`/reset-password${window.location.hash}`);
}

export default function RootLayout() {
  const session = useSession();
  const [splash, setSplash] = useState(!splashPlayed);
  // Heading font. If it ever fails to load, the app carries on with the default font.
  const [fontsLoaded, fontError] = useFonts({ BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold });
  const loading = session === undefined || (!fontsLoaded && !fontError);
  const uid = session?.user.id;

  // Phone notifications: register this device after login; tapping one opens the right screen.
  useEffect(() => { if (uid) registerForPush(); }, [uid]);
  useNotificationTaps();

  return (
    <>
      <StatusBar style="dark" />
      {loading ? (
        !splash && <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}><PinLoader size={60} /></View>
      ) : (
        // Guests can browse and search. An account is needed to send a note, offer a service, or see Inbox and Plan.
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="service/[id]" />
          <Stack.Screen name="business/[id]" />
          <Stack.Screen name="login" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="reviews/[merchantId]" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="refunds" />
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="offer" />
            <Stack.Screen name="inbox" />
            <Stack.Screen name="plan" />
            <Stack.Screen name="messages" />
            <Stack.Screen name="bookings" />
            <Stack.Screen name="account" />
            <Stack.Screen name="edit/[id]" />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="chat/[id]" />
            <Stack.Screen name="support" />
            <Stack.Screen name="review/[serviceId]" />
            <Stack.Screen name="book/[conversationId]" />
            <Stack.Screen name="admin" />
          </Stack.Protected>
        </Stack>
      )}
      {splash && <Splash ready={!loading} onDone={() => { splashPlayed = true; setSplash(false); }} />}
    </>
  );
}
