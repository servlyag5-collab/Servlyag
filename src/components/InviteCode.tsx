import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { bookingDay } from '../lib/bookings';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

// Plan screen: "Have a Founding Business code?" (database v41). The code only works for the email it was made for
// (the database checks), once; it starts the free trial straight away. Shown only to people with no active plan.
export function InviteCode({ onDone, next }: { onDone: () => void; next?: string }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ends, setEnds] = useState<string | null>(null);

  async function redeem() {
    if (!code.trim()) return;
    setBusy(true); setErr('');
    const { data, error } = await supabase.rpc('redeem_invite', { p_code: code });
    setBusy(false);
    if (error) return setErr(error.message);
    setEnds(data as string); setCode(''); onDone();
  }

  if (ends) return (
    <View style={[ui.card, { borderColor: colors.blue, borderWidth: 2, gap: 8 }]}>
      <Text style={ui.h2}>Welcome, Founding Business!</Text>
      <Text style={ui.muted}>Your free trial is on until {bookingDay(ends)}. Create your listing so customers can find you.</Text>
      <Pressable style={[ui.btn, ui.primary]} onPress={() => router.push('/offer' as Href)}>
        <Text style={[ui.btnText, { color: '#fff' }]}>{next === 'offer' ? 'Continue: create your listing' : 'Create your listing'}</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[ui.card, { borderColor: colors.gold, borderWidth: 2, gap: 8 }]}>
      <Text style={{ fontWeight: '800', fontSize: 16, color: colors.ink }}>Have a Founding Business code?</Text>
      <Text style={ui.muted}>Enter the code Servly sent you. It works with the email you signed up with.</Text>
      <View style={ui.row}>
        <TextInput placeholderTextColor={colors.muted} style={[ui.field, { flex: 1, minWidth: 0 }]} placeholder="e.g. SRV-7KQ4"
          autoCapitalize="characters" autoCorrect={false} value={code} onChangeText={(v) => { setCode(v); setErr(''); }} onSubmitEditing={redeem} />
        <Pressable style={[ui.btn, ui.outline, { borderColor: colors.blue }]} onPress={redeem} disabled={busy || !code.trim()}>
          {busy ? <ActivityIndicator color={colors.blue} /> : <Text style={[ui.btnText, { color: colors.blue }]}>Use code</Text>}
        </Pressable>
      </View>
      {!!err && <Text style={ui.error}>{err}</Text>}
    </View>
  );
}
