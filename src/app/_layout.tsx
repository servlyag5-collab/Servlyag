import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Splash } from '../components/Splash';
import { useSession } from '../lib/session';
import { colors } from '../lib/theme';

let splashPlayed = false; // the opening animation plays once per app launch

export default function RootLayout() {
  const session = useSession();
  const [splash, setSplash] = useState(!splashPlayed);
  const loading = session === undefined;

  return (
    <>
      <StatusBar style="dark" />
      {loading ? (
        !splash && <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator color={colors.blue} /></View>
      ) : (
        // Guests can browse and search. An account is needed to send a note, offer a service, or see Inbox and Plan.
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="service/[id]" />
          <Stack.Screen name="business/[id]" />
          <Stack.Screen name="login" />
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
          </Stack.Protected>
        </Stack>
      )}
      {splash && <Splash ready={!loading} onDone={() => { splashPlayed = true; setSplash(false); }} />}
    </>
  );
}
