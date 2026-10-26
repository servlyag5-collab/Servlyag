import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookingCard } from '../../components/BookingCard';
import { TopBar } from '../../components/Menu';
import { ReportButton } from '../../components/ReportButton';
import { hasBookingApp, type Booking } from '../../lib/bookings';
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
  const [bookings, setBookings] = useState<Record<string, Booking>>({});
  const [canBook, setCanBook] = useState(false); // merchant has the booking app
  const [blocked, setBlocked] = useState(false);   // I blocked the other person
  const [askBlock, setAskBlock] = useState(false);

  const loadBookings = useCallback(() => {
    supabase.from('bookings').select('*').eq('conversation_id', id)
      .then(({ data }) => setBookings(Object.fromEntries(((data as Booking[]) ?? []).map((b) => [b.id, b]))));
  }, [id]);

  // Add a message once, whether it came from my own send or from the live feed.
  const add = useCallback((m: Message) => setRows((r) => (r?.some((x) => x.id === m.id) ? r : [...(r ?? []), m])), []);

  useEffect(() => {
    if (!uid) return;
    supabase.from('conversations')
      .select('*,services(title),customer:profiles!customer_id(display_name),merchant:profiles!merchant_id(display_name)')
      .eq('id', id).single()
      .then(({ data, error }) => {
        if (!data) return setErr(error?.message ?? 'Conversation not found.');
        const conv = data as unknown as Conv;
        setC(conv);
        if (conv.merchant_id === uid) hasBookingApp().then(setCanBook);
      });
    supabase.from('messages').select('*').eq('conversation_id', id).order('created_at')
      .then(({ data }) => setRows((data as Message[]) ?? []));
    loadBookings();
    markRead(id);
    // Live: new messages appear straight away, and booking cards update when answered or cancelled.
    const ch = supabase.channel(channelName(`chat-${id}`))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (p) => {
        add(p.new as Message);
        markRead(id);
        if ((p.new as Message).booking_id) loadBookings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `conversation_id=eq.${id}` }, () => loadBookings())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, uid]);

  useEffect(() => { setTimeout(() => sc.current?.scrollToEnd({ animated: true }), 60); }, [rows?.length]);

  async function send(kind: 'text' | 'review_request' = 'text') {
    const body = kind === 'review_request'
      ? `Thank you for choosing ${c?.merchant?.display_name || 'us'}! If you have a moment, we'd love a review of our service.`
      : text.trim();
    if (!body || !uid) return;
    setBusy(true); setErr('');
    const { data, error } = await supabase.from('messages').insert({ conversation_id: id, sender_id: uid, body, kind }).select('*').single();
    setBusy(false);
    if (error) return setErr(/row-level security/i.test(error.message) ? "You can't message this person right now." : error.message);
    if (kind === 'text') setText('');
    add(data as Message);
  }

  const iAmMerchant = !!c && c.merchant_id === uid;
  const other = c ? (iAmMerchant ? c.customer?.display_name || 'Customer' : c.merchant?.display_name || 'Merchant') : '';
  const otherId = c ? (iAmMerchant ? c.customer_id : c.merchant_id) : '';

  // Block / unblock the other person: blocked people can't message or book you (enforced by the database).
  useEffect(() => {
    if (!uid || !otherId) return;
    supabase.from('blocks').select('blocked_id').eq('blocker_id', uid).eq('blocked_id', otherId).maybeSingle()
      .then(({ data }) => setBlocked(!!data));
  }, [uid, otherId]);
  async function setBlock(on: boolean) {
    setAskBlock(false);
    const { error } = on
      ? await supabase.from('blocks').insert({ blocker_id: uid, blocked_id: otherId })
      : await supabase.from('blocks').delete().eq('blocker_id', uid!).eq('blocked_id', otherId);
    if (error) return setErr(error.message);
    setBlocked(on);
  }
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
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <ReportButton targetType="user" targetId={otherId} label={`Report ${other}`} />
                <Pressable onPress={() => (blocked ? setBlock(false) : setAskBlock(true))} hitSlop={6}>
                  <Text style={{ color: blocked ? colors.blue : colors.red, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' }}>{blocked ? 'Unblock' : 'Block'}</Text>
                </Pressable>
              </View>
              {askBlock && (
                <View style={{ backgroundColor: '#FDECEE', borderRadius: 12, padding: 12, gap: 8 }}>
                  <Text style={{ color: colors.ink, fontWeight: '700' }}>Block {other}? They won't be able to message you or send you bookings. You can unblock them here any time.</Text>
                  <View style={ui.row}>
                    <Pressable style={[ui.btn, ui.outline, { flex: 1, height: 40 }]} onPress={() => setAskBlock(false)}><Text style={[ui.btnText, { color: colors.ink }]}>Cancel</Text></Pressable>
                    <Pressable style={[ui.btn, { flex: 1, height: 40, backgroundColor: colors.red }]} onPress={() => setBlock(true)}><Text style={[ui.btnText, { color: '#fff' }]}>Block</Text></Pressable>
                  </View>
                </View>
              )}
              {blocked && <Text style={{ color: colors.red, fontWeight: '700' }}>You blocked {other}. They can't message you or send you bookings.</Text>}
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
              {iAmMerchant && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {canBook && (
                    <Pressable onPress={() => router.push({ pathname: '/book/[conversationId]', params: { conversationId: id } })}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.blue }}>
                      <Ionicons name="calendar" size={16} color="#fff" />
                      <Text style={{ fontWeight: '700', color: '#fff' }}>Book this customer</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => send('review_request')} disabled={busy}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.gold, backgroundColor: '#FFFBEA' }}>
                    <Ionicons name="star" size={16} color={colors.gold} />
                    <Text style={{ fontWeight: '700', color: colors.ink }}>Ask for a review</Text>
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
            // A booking request: the live booking card (Confirm/Decline for the customer, Cancel for the merchant).
            if (m.kind === 'booking' && m.booking_id && bookings[m.booking_id]) return (
              <View key={m.id} style={{ alignSelf: 'stretch' }}>
                <BookingCard b={bookings[m.booking_id]} iAmMerchant={iAmMerchant} title={iAmMerchant ? 'You sent a booking' : 'Booking request'}
                  subtitle={c?.services?.title} onChanged={loadBookings} />
              </View>
            );
            // An automatic reminder before a confirmed booking.
            if (m.kind === 'booking_reminder') return (
              <View key={m.id} style={{ alignSelf: 'center', maxWidth: '90%', flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FFFBEA', borderWidth: 1, borderColor: colors.gold, borderRadius: 14, padding: 12 }}>
                <Ionicons name="notifications" size={18} color="#B07C00" />
                <View style={{ flexShrink: 1, gap: 4 }}>
                  <Text style={{ color: colors.ink, fontSize: 15, lineHeight: 21 }}>{m.body}</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{when(m.created_at)}</Text>
                </View>
              </View>
            );
            // The merchant's review request: a highlighted card; the customer gets a Leave a review button.
            if (m.kind === 'review_request' && c) return (
              <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: '#FFFBEA', borderWidth: 1, borderColor: colors.gold, borderRadius: 18, padding: 14, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="star" size={16} color={colors.gold} />
                  <Text style={{ fontWeight: '800', color: colors.ink }}>{mine ? 'You asked for a review' : 'Review request'}</Text>
                </View>
                <Text style={{ color: colors.ink, fontSize: 16, lineHeight: 22 }}>{m.body}</Text>
                {!mine && (
                  <Pressable style={[ui.btn, { height: 44, backgroundColor: colors.gold }]}
                    onPress={() => router.push({ pathname: '/review/[serviceId]', params: { serviceId: c.service_id } })}>
                    <Text style={[ui.btnText, { color: colors.ink }]}>Leave a review</Text>
                  </Pressable>
                )}
                <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'right' }}>{when(m.created_at)}</Text>
              </View>
            );
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
            <Pressable onPress={() => send('text')} disabled={busy || !text.trim() || !c} accessibilityLabel="Send message"
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: text.trim() ? colors.blue : colors.border, alignItems: 'center', justifyContent: 'center' }}>
              {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
