import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/Menu';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

// Back to where the guest came from (e.g. the listing they wanted to message), else Home.
const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

// Where the password reset email's link opens: this app's "Set a new password" screen.
// (Must also be listed in Supabase > Authentication > URL Configuration > Redirect URLs.)
const resetLink = () => (Platform.OS === 'web' ? `${window.location.origin}/reset-password` : Linking.createURL('/reset-password'));

export default function Login() {
  const params = useLocalSearchParams<{ mode?: 'in' | 'up' }>();
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>(params.mode === 'up' ? 'up' : 'in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [info, setInfo] = useState(''); // good news, shown in blue

  const switchTo = (m: typeof mode) => { setMode(m); setMsg(''); setInfo(''); };

  async function go() {
    if (!email.trim()) return setMsg('Please enter your email.');
    setBusy(true); setMsg(''); setInfo('');
    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: resetLink() });
      setBusy(false);
      // Same message whether or not the email has an account, so nobody can check who is registered.
      if (error && !/not found|no user/i.test(error.message)) return setMsg(error.message);
      return setInfo('If an account exists for that email, we\'ve sent a link to reset your password. Check your inbox (and spam folder).');
    }
    const r = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      : await supabase.auth.signUp({ email: email.trim(), password: pw, options: { data: { display_name: name.trim() } } });
    setBusy(false);
    if (r.error) setMsg(r.error.message);
    else if (mode === 'up' && !r.data.session) setInfo('Check your email to confirm your account, then log in.');
    else leave();
  }

  const title = mode === 'in' ? 'Log in' : mode === 'up' ? 'Create your account' : 'Reset your password';
  const button = mode === 'in' ? 'Log in' : mode === 'up' ? 'Sign up' : 'Send reset link';

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        <View style={ui.card}>
          <Text style={ui.h2}>{title}</Text>
          {mode === 'reset' && <Text style={ui.muted}>Enter the email you signed up with and we'll send you a link to choose a new password.</Text>}
          {mode === 'up' && <TextInput style={ui.field} placeholder="Your name or business name" value={name} onChangeText={setName} />}
          <TextInput style={ui.field} placeholder="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
          {mode !== 'reset' && (
            <TextInput style={ui.field} placeholder="Password" secureTextEntry autoCapitalize="none" autoCorrect={false}
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'} value={pw} onChangeText={setPw} onSubmitEditing={go} />
          )}
          {mode === 'in' && (
            <Pressable onPress={() => switchTo('reset')} style={{ alignSelf: 'flex-end' }}>
              <Text style={{ color: colors.blue, fontWeight: '700' }}>Forgot password?</Text>
            </Pressable>
          )}
          {!!msg && <Text style={ui.error}>{msg}</Text>}
          {!!info && <Text style={{ color: colors.blue, fontWeight: '700', lineHeight: 22 }}>{info}</Text>}
          <Pressable style={[ui.btn, ui.primary]} onPress={go} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>{button}</Text>}
          </Pressable>
          <Pressable onPress={() => switchTo(mode === 'up' ? 'in' : mode === 'reset' ? 'in' : 'up')}>
            <Text style={{ color: colors.blue, fontWeight: '700', textAlign: 'center' }}>
              {mode === 'in' ? 'New to Servly? Create an account' : mode === 'reset' ? 'Back to log in' : 'Have an account? Log in'}
            </Text>
          </Pressable>
          <Pressable onPress={leave}>
            <Text style={{ color: colors.muted, fontWeight: '700', textAlign: 'center' }}>Keep browsing without an account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
