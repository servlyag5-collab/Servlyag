import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

// Back to where the guest came from (e.g. the listing they wanted to message), else Home.
const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function Login() {
  const params = useLocalSearchParams<{ mode?: 'in' | 'up' }>();
  const [mode, setMode] = useState<'in' | 'up'>(params.mode === 'up' ? 'up' : 'in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function go() {
    setBusy(true); setMsg('');
    const r = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      : await supabase.auth.signUp({ email: email.trim(), password: pw, options: { data: { display_name: name.trim() } } });
    setBusy(false);
    if (r.error) setMsg(r.error.message);
    else if (mode === 'up' && !r.data.session) setMsg('Check your email to confirm your account, then log in.');
    else leave();
  }

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/logo.png')} style={{ height: 52, width: 196 }} resizeMode="contain" />
        <View style={ui.card}>
          <Text style={ui.h2}>{mode === 'in' ? 'Log in' : 'Create your account'}</Text>
          {mode === 'up' && <TextInput style={ui.field} placeholder="Your name or business name" value={name} onChangeText={setName} />}
          <TextInput style={ui.field} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={ui.field} placeholder="Password" secureTextEntry value={pw} onChangeText={setPw} />
          {!!msg && <Text style={ui.error}>{msg}</Text>}
          <Pressable style={[ui.btn, ui.primary]} onPress={go} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>{mode === 'in' ? 'Log in' : 'Sign up'}</Text>}
          </Pressable>
          <Pressable onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(''); }}>
            <Text style={{ color: colors.blue, fontWeight: '700', textAlign: 'center' }}>
              {mode === 'in' ? 'New to Servly? Create an account' : 'Have an account? Log in'}
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
