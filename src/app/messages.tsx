import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cover } from '../components/Cover';
import { TopBar } from '../components/Menu';
import { channelName, isUnread, type Conversation } from '../lib/chat';
import { useMode } from '../lib/mode';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type Row = Conversation & {
  services: { title: string; photos: string[] } | null;
  customer: { display_name: string } | null;
  merchant: { display_name: string } | null;
};
const when = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// All my conversations, one per customer + listing. Customer view: chats I started.
// Merchant view: chats from customers about my listings. Updates live.
export default function Messages() {
  const session = useSession();
  const uid = session?.user.id;
  const merchant = useMode() === 'merchant';
  const col = merchant ? 'merchant_id' : 'customer_id';
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    if (!uid) return;
    supabase.from('conversations')
      .select('*,services(title,photos),customer:profiles!customer_id(display_name),merchant:profiles!merchant_id(display_name)')
      .eq(col, uid).neq('last_message', '').order('last_message_at', { ascending: false })
      .then(({ data, error }) => { setErr(error?.message ?? ''); setRows((data as unknown as Row[]) ?? []); });
  }, [uid, col]);

  useFocusEffect(load);

  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel(channelName(`inbox-${col}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `${col}=eq.${uid}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, col, load]);

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        <Text style={ui.h1}>Messages</Text>
        <Text style={ui.muted}>{merchant ? 'Conversations with customers about your listings.' : 'Your conversations with merchants.'}</Text>
        {!rows && <ActivityIndicator color={colors.blue} />}
        {!!err && <Text style={ui.error}>{err}</Text>}
        {!err && rows?.length === 0 && (
          <Text style={ui.muted}>{merchant ? 'No messages yet. When a customer writes about one of your services, it shows up here.' : 'No messages yet. Open a listing and send a note to start a conversation.'}</Text>
        )}
        {rows?.map((c) => {
          const unread = !!uid && isUnread(c, uid);
          const other = merchant ? c.customer?.display_name || 'Customer' : c.merchant?.display_name || 'Merchant';
          return (
            <Pressable key={c.id} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id } })}
              style={[ui.card, { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'center' }, unread && { borderColor: colors.blue, borderWidth: 2 }]}>
              <Cover photos={c.services?.photos} title={c.services?.title ?? 'S'} width={56} height={56} radius={12} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: colors.ink }} numberOfLines={1}>{other}</Text>
                  <Text style={{ fontSize: 12, color: unread ? colors.blue : colors.muted, fontWeight: unread ? '800' : '400' }}>{when(c.last_message_at)}</Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.blue, fontWeight: '700' }} numberOfLines={1}>{c.services?.title ?? 'Listing no longer available'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, fontSize: 15, color: unread ? colors.ink : colors.muted, fontWeight: unread ? '700' : '400' }} numberOfLines={1}>{c.last_message}</Text>
                  {unread && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue }} />}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
