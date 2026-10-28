import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WideSplit } from '../components/WideSplit';
import { TopBar } from '../components/Menu';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

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
  const nativeUrl = Linking.useURL();
  const url = Platform.OS === 'web' ? window.location.href : nativeUrl;
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [why, setWhy] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (state !== 'checking' || (Platform.OS !== 'web' && !url)) return;
    const p = linkParams(url);
    const finish = (error?: { message: string } | null) => {
      if (error) { setWhy(error.message); return setState('invalid'); }
      if (Platform.OS === 'web') window.history.replaceState(null, '', window.location.pathname); // hide the code from the address bar
      setState('ready');
    };
    if (p.error_description || p.error) { setWhy(p.error_description || p.error); return setState('invalid'); }
    if (p.access_token && p.refresh_token) {
      supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token }).then(({ error }) => finish(error));
    } else if (p.code) {
      supabase.auth.exchangeCodeForSession(p.code).then(({ error }) => finish(error));
    } else {
      setWhy('This page needs the link from your password reset email.');
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
          {state === 'checking' && <ActivityIndicator color={colors.blue} />}
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
              <TextInput style={ui.field} placeholder="New password" secureTextEntry autoCapitalize="none" autoCorrect={false}
                autoComplete="new-password" value={pw} onChangeText={(v) => { setPw(v); setMsg(''); }} />
              <TextInput style={ui.field} placeholder="Type it again" secureTextEntry autoCapitalize="none" autoCorrect={false}
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
