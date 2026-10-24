import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/Menu';
import { channelName } from '../lib/chat';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type Ticket = { id: string; topic: string; subject: string; body: string; status: 'open' | 'resolved'; reply: string | null; replied_at: string | null; created_at: string };
const TOPICS = [
  { id: 'billing', label: 'Billing' }, { id: 'listing', label: 'My listing' },
  { id: 'account', label: 'My account' }, { id: 'other', label: 'Something else' },
];
const topicLabel = (id: string) => TOPICS.find((t) => t.id === id)?.label ?? id;

// Merchants contact Servly. Requests land in Supabase (support_tickets); the owner's reply shows here.
export default function Support() {
  const session = useSession();
  const uid = session?.user.id;
  const [topic, setTopic] = useState('billing');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [rows, setRows] = useState<Ticket[] | null>(null);
  const [loadErr, setLoadErr] = useState('');

  const load = useCallback(() => {
    if (!uid) return;
    supabase.from('support_tickets').select('*').eq('user_id', uid).order('created_at', { ascending: false })
      .then(({ data, error }) => { setLoadErr(error?.message ?? ''); setRows((data as Ticket[]) ?? []); });
  }, [uid]);
  useFocusEffect(load);

  // Your reply appears without refreshing.
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel(channelName('support'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${uid}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, load]);

  async function send() {
    if (!subject.trim() || !body.trim()) return setMsg('Please add a subject and a message.');
    setBusy(true); setMsg('');
    const { error } = await supabase.from('support_tickets').insert({ user_id: uid, topic, subject: subject.trim(), body: body.trim() });
    setBusy(false);
    if (error) return setMsg(error.message);
    setSubject(''); setBody(''); setMsg('Sent. We will get back to you here.');
    load();
  }

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        <Text style={ui.h1}>Contact support</Text>
        <Text style={ui.muted}>Questions about billing, your listings or your account? Send us a message and we'll reply here.</Text>

        <View style={ui.card}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>What is it about?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TOPICS.map((t) => {
              const on = topic === t.id;
              return (
                <Pressable key={t.id} onPress={() => setTopic(t.id)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: on ? colors.blue : colors.border, backgroundColor: on ? colors.blue : '#fff' }}>
                  <Text style={{ color: on ? '#fff' : colors.ink, fontWeight: '700' }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput style={ui.field} placeholder="Subject" value={subject} onChangeText={(v) => { setSubject(v); setMsg(''); }} maxLength={120} />
          <TextInput style={[ui.field, { height: 130, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="Tell us what's going on" multiline
            value={body} onChangeText={(v) => { setBody(v); setMsg(''); }} maxLength={4000} />
          {!!msg && <Text style={msg.startsWith('Sent') ? { color: colors.blue, fontWeight: '700' } : ui.error}>{msg}</Text>}
          <Pressable style={[ui.btn, ui.primary]} onPress={send} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Send to support</Text>}
          </Pressable>
        </View>

        <Text style={[ui.h2, { marginTop: 8 }]}>Your requests</Text>
        {!rows && !loadErr && <ActivityIndicator color={colors.blue} />}
        {!!loadErr && <Text style={ui.error}>{loadErr}</Text>}
        {!loadErr && rows?.length === 0 && <Text style={ui.muted}>No requests yet.</Text>}
        {rows?.map((t) => (
          <View key={t.id} style={ui.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 13, color: colors.muted }}>{topicLabel(t.topic)} · {new Date(t.created_at).toLocaleDateString()}</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff', backgroundColor: t.status === 'resolved' ? colors.blue : colors.muted, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' }}>
                {t.status === 'resolved' ? 'Resolved' : 'Open'}
              </Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{t.subject}</Text>
            <Text style={ui.muted}>{t.body}</Text>
            {!!t.reply && (
              <View style={{ backgroundColor: '#EAF3FB', borderRadius: 12, padding: 12, gap: 4 }}>
                <Text style={{ fontWeight: '800', color: colors.blue }}>Servly support{t.replied_at ? ` · ${new Date(t.replied_at).toLocaleDateString()}` : ''}</Text>
                <Text style={{ fontSize: 16, color: colors.ink, lineHeight: 22 }}>{t.reply}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
