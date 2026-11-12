import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { clearAuthLink, useAuthLink } from '../lib/authLink';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PasswordInput } from '../components/PasswordInput';
import { WideSplit } from '../components/WideSplit';
import { TopBar } from '../components/Menu';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';
import { PinLoader } from '../components/PinLoader';

// Read the values Supabase adds to the reset link (after # or ?): tokens, a code, or an error.
function linkParams(url: string | null) {
  const out: Record<string, string> = {};
  if (!url) return out;
  for (const kv of url.split(/[?#]/).slice(1).join('&').split('&')) {
    const [k, v = ''] = kv.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return out;
}

// Opened from the "Reset your password" email: signs the person in from the link, then lets them
// choose a new password.
export default function ResetPassword() {
  // Phones: the link is caught when it reaches the app (src/lib/authLink.ts), even if this screen opens later.
  const keptUrl = useAuthLink();
  const hasTokens = (u: string | null) => !!u && /[?#&](access_token|code|error)=/.test(u);
  const url = Platform.OS === 'web' ? window.location.href : keptUrl;
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [why, setWhy] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // Never spin forever: after 12 seconds, say so and offer a new link.
  useEffect(() => {
    if (state !== 'checking') return;
    const t = setTimeout(() => {
      setWhy(url ? 'The reset link could not be checked.' : 'The app did not receive the link from your email.');
      setState('invalid');
    }, 12000);
    return () => clearTimeout(t);
  }, [state, url]);

  useEffect(() => {
    if (state !== 'checking' || (Platform.OS !== 'web' && !hasTokens(url))) return;
    try {
      const p = linkParams(url);
      clearAuthLink();
      const finish = (error?: { message: string } | null) => {
        if (error) { setWhy(error.message); return setState('invalid'); }
        if (Platform.OS === 'web') window.history.replaceState(null, '', window.location.pathname); // hide the code from the address bar
        setState('ready');
      };
      const failed = (e: unknown) => finish({ message: e instanceof Error ? e.message : 'The reset link could not be checked.' });
      if (p.error_description || p.error) { setWhy(p.error_description || p.error); return setState('invalid'); }
      if (p.access_token && p.refresh_token) {
        supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token }).then(({ error }) => finish(error), failed);
      } else if (p.code) {
        supabase.auth.exchangeCodeForSession(p.code).then(({ error }) => finish(error), failed);
      } else {
        setWhy('This page needs the link from your password reset email.');
        setState('invalid');
      }
    } catch {
      setWhy('The reset link could not be read.');
      setState('invalid');
    }
  }, [url, state]);

  async function save() {
    if (pw.length < 6) return setMsg('Use at least 6 characters.');
    if (pw !== pw2) return setMsg('The two passwords don\'t match.');
    setBusy(true); setMsg('');
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    setState('done');
  }

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        <WideSplit>
        <View style={ui.card}>
          <Text style={ui.h2}>Set a new password</Text>
          {state === 'checking' && <PinLoader />}
          {state === 'invalid' && (
            <>
              <Text style={ui.error}>{why}</Text>
              <Text style={ui.muted}>Reset links work once and expire after a while. Ask for a new one below.</Text>
              <Pressable style={[ui.btn, ui.primary]} onPress={() => router.replace('/login')}>
                <Text style={[ui.btnText, { color: '#fff' }]}>Send a new link</Text>
              </Pressable>
            </>
          )}
          {state === 'ready' && (
            <>
              <PasswordInput placeholder="New password"
                autoComplete="new-password" value={pw} onChangeText={(v) => { setPw(v); setMsg(''); }} />
              <PasswordInput placeholder="Type it again"
                autoComplete="new-password" value={pw2} onChangeText={(v) => { setPw2(v); setMsg(''); }} onSubmitEditing={save} />
              {!!msg && <Text style={ui.error}>{msg}</Text>}
              <Pressable style={[ui.btn, ui.primary]} onPress={save} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Save new password</Text>}
              </Pressable>
            </>
          )}
          {state === 'done' && (
            <>
              <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>Your password has been changed. You're logged in.</Text>
              <Pressable style={[ui.btn, ui.primary]} onPress={() => router.replace('/')}>
                <Text style={[ui.btnText, { color: '#fff' }]}>Continue</Text>
              </Pressable>
            </>
          )}
        </View>
        </WideSplit>
      </ScrollView>
    </SafeAreaView>
  );
}
