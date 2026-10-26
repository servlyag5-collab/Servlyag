import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { supabase } from './supabase';

// Phone notifications. The database sends them (new messages, booking cards and reminders, plan
// ending soon) through Expo's push service to every device saved with save_push_token.
// Needs a real build or Expo Go on iPhone, and an EAS project id (run `npx eas-cli init` once).
// On the web, and anywhere push isn't available, everything here quietly does nothing.

let myToken: string | null = null;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

// Ask permission (first time only) and save this phone's notification address for the logged-in user.
export async function registerForPush() {
  if (Platform.OS === 'web') return;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Messages and bookings', importance: Notifications.AndroidImportance.HIGH });
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) { console.warn('Push notifications need an EAS project id: run `npx eas-cli init` once.'); return; }
    myToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase.rpc('save_push_token', { p_token: myToken, p_platform: Platform.OS });
  } catch (e) {
    console.warn('Push notifications are not available here:', (e as Error).message);
  }
}

// On log out / account deletion: stop sending this account's notifications to this phone.
export async function forgetThisDevice() {
  if (!myToken) return;
  try { await supabase.rpc('remove_push_token', { p_token: myToken }); } catch { /* best effort */ }
  myToken = null;
}

// Tapping a notification opens the right screen (a chat, or the Plan screen).
export function useNotificationTaps() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
