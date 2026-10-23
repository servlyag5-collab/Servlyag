import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../../components/Menu';
import { channelName, phoneDigits, type Conversation, type Message } from '../../lib/chat';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, ui } from '../../lib/theme';

type Conv = Conversation & {
  services: { title: string } | null;
  customer: { display_name: string } | null;
  merchant: { display_name: string } | null;
};
const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const markRead = (id: string) => { supabase.rpc('mark_conversation_read', { p_conv: id }).then(() => {}); };

// One conversation between a customer and a merchant about one listing, updating live.
export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const uid = session?.user.id;
  const [c, setC] = useState<Conv | null>(null);
  const [rows, setRows] = useState<Message[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const sc = useRef<ScrollViewInstance>(null);

  // Add a message once, whether it came from my own send or from the live feed.
  const add = useCallback((m: Message) => setRows((r) => (r?.some((x) => x.id === m.id) ? r : [...(r ?? []), m])), []);

  useEffect(() => {
    if (!uid) return;
    supabase.from('conversations')
      .select('*,services(title),customer:profiles!customer_id(display_name),merchant:profiles!merchant_id(display_name)')
      .eq('id', id).single()
      .then(({ data, error }) => { if (!data) return setErr(error?.message ?? 'Conversation not found.'); setC(data as unknown as Conv); });
    supabase.from('messages').select('*').eq('conversation_id', id).order('created_at')
      .then(({ data }) => setRows((data as Message[]) ?? []));
    markRead(id);
    // Live: the other person's new messages appear straight away.
    const ch = supabase.channel(channelName(`chat-${id}`))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (p) => {
        add(p.new as Message);
        markRead(id);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, uid]);

  useEffect(() => { setTimeout(() => sc.current?.scrollToEnd({ animated: true }), 60); }, [rows?.length]);

  async function send() {
    const body = text.trim();
    if (!body || !uid) return;
    setBusy(true); setErr('');
    const { data, error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: uid, body }).select('*').single();
    setBusy(false);
    if (error) return setErr(error.message);
    setText('');
    add(data as Message);
  }

  const iAmMerchant = !!c && c.merchant_id === uid;
  const other = c ? (iAmMerchant ? c.customer?.display_name || 'Customer' : c.merchant?.display_name || 'Merchant') : '';
  const bar = { width: '100%' as const, maxWidth: 640, alignSelf: 'center' as const, paddingHorizontal: 16 };

  return (
    <SafeAreaView style={ui.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[bar, { paddingTop: 16, paddingBottom: 12, gap: 10, borderBottomWidth: 1, borderColor: colors.border }]}>
          <TopBar />
          {c && (
            <>
              <Pressable onPress={() => router.push({ pathname: '/service/[id]', params: { id: c.service_id } })}>
                <Text style={ui.h2} numberOfLines={1}>{other}</Text>
                <Text style={{ color: colors.blue, fontWeight: '700' }} numberOfLines={1}>About: {c.services?.title ?? 'a listing'}</Text>
              </Pressable>
              {iAmMerchant && !!c.contact && (
                <View style={ui.row}>
                  <Pressable style={[ui.btn, ui.outline, { flex: 1, height: 44, flexDirection: 'row', gap: 6 }]} onPress={() => Linking.openURL(`tel:+${phoneDigits(c.contact!)}`)}>
                    <Ionicons name="call-outline" size={18} color={colors.blue} />
                    <Text style={[ui.btnText, { color: colors.ink }]}>Call {c.contact}</Text>
                  </Pressable>
                  <Pressable style={[ui.btn, ui.outline, { flex: 1, height: 44, flexDirection: 'row', gap: 6 }]} onPress={() => Linking.openURL(`https://wa.me/${phoneDigits(c.contact!)}`)}>
                    <Ionicons name="logo-whatsapp" size={18} color={colors.blue} />
                    <Text style={[ui.btnText, { color: colors.ink }]}>WhatsApp</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>

        <ScrollView ref={sc} style={{ flex: 1 }} contentContainerStyle={[bar, { paddingVertical: 16, gap: 8 }]}>
          {!!err && !c && <Text style={ui.error}>{err}</Text>}
          {!rows && !err && <ActivityIndicator color={colors.blue} />}
          {rows?.length === 0 && <Text style={[ui.muted, { textAlign: 'center' }]}>No messages yet. Say hello!</Text>}
          {rows?.map((m) => {
            const mine = m.sender_id === uid;
            return (
              <View key={m.id} style={{
                alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%',
                backgroundColor: mine ? colors.blue : colors.card, borderWidth: mine ? 0 : 1, borderColor: colors.border,
                borderRadius: 18, borderBottomRightRadius: mine ? 4 : 18, borderBottomLeftRadius: mine ? 18 : 4,
                paddingHorizontal: 14, paddingVertical: 10,
              }}>
                <Text style={{ color: mine ? '#fff' : colors.ink, fontSize: 16, lineHeight: 22 }}>{m.body}</Text>
                <Text style={{ color: mine ? '#DCEBF8' : colors.muted, fontSize: 11, marginTop: 4, textAlign: 'right' }}>{when(m.created_at)}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={[bar, { paddingVertical: 12, gap: 6, borderTopWidth: 1, borderColor: colors.border }]}>
          {!!err && !!c && <Text style={ui.error}>{err}</Text>}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <TextInput style={[ui.field, { flex: 1, height: undefined, minHeight: 48, maxHeight: 120, paddingVertical: 12 }]}
              placeholder="Write a message" placeholderTextColor={colors.muted} multiline value={text} onChangeText={setText} editable={!!c} />
            <Pressable onPress={send} disabled={busy || !text.trim() || !c} accessibilityLabel="Send message"
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: text.trim() ? colors.blue : colors.border, alignItems: 'center', justifyContent: 'center' }}>
              {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
