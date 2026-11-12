import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

// Phones: catch a sign-in link (password reset email) the moment it reaches the app, and keep it.
// When the app is already open, the phone hands the link over BEFORE the Set a new password screen
// exists, so that screen would miss it. Imported by _layout.tsx so the listener starts with the app.
const isAuthLink = (u: string | null): u is string => !!u && /[?#&](access_token|code|error)=/.test(u);

let kept: string | null = null;
const waiting = new Set<(u: string) => void>();
function keep(u: string | null) {
  if (!isAuthLink(u)) return;
  kept = u;
  waiting.forEach((f) => f(u));
}

if (Platform.OS !== 'web') {
  Linking.getInitialURL().then(keep).catch(() => {});
  Linking.addEventListener('url', (e) => keep(e.url));
}

// The newest sign-in link the app received (null until one arrives).
export function useAuthLink() {
  const [url, setUrl] = useState<string | null>(kept);
  useEffect(() => {
    if (kept) setUrl(kept);
    waiting.add(setUrl);
    return () => { waiting.delete(setUrl); };
  }, []);
  return url;
}

// Forget the kept link once it has been used (each link works only once).
export function clearAuthLink() {
  kept = null;
}
