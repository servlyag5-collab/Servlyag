import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookingCard } from '../components/BookingCard';
import { TopBar } from '../components/Menu';
import { hasBookingApp, isPast, type Booking } from '../lib/bookings';
import { channelName } from '../lib/chat';
import { useMode } from '../lib/mode';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { customerName } from '../lib/names';
import { colors, ui } from '../lib/theme';

type Row = Booking & {
  services: { title: string } | null;
  customer: { display_name: string; screen_name: string } | null;
  conversations: { customer_as_business: boolean } | null;
  merchant: { display_name: string } | null;
};

// Merchant view: the bookings I made for customers. Customer view ("My bookings"): bookings made for me.
// Upcoming / Past tabs; each booking links to its chat. Updates live.
export default function Bookings() {
  const session = useSession();
  const uid = session?.user.id;
  const merchant = useMode() === 'merchant';
  const col = merchant ? 'merchant_id' : 'customer_id';
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const load = useCallback(() => {
    if (!uid) return;
    supabase.from('bookings')
      .select('*,services(title),customer:profiles!customer_id(display_name,screen_name),conversations(customer_as_business),merchant:profiles!merchant_id(display_name)')
      .eq(col, uid).order('starts_at')
      .then(({ data, error }) => { setErr(error?.message ?? ''); setRows((data as unknown as Row[]) ?? []); });
    if (merchant) hasBookingApp().then(setAllowed); else setAllowed(true);
  }, [uid, col, merchant]);
  useFocusEffect(load);

  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel(channelName('bookings'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `${col}=eq.${uid}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, col, load]);

  // Upcoming: soonest first. Past (and declined/cancelled): most recent first.
  const upcoming = (rows ?? []).filter((b) => !isPast(b) && (b.status === 'pending' || b.status === 'confirmed'));
  const past = (rows ?? []).filter((b) => !upcoming.includes(b)).reverse();
  const list = tab === 'upcoming' ? upcoming : past;
  const pending = upcoming.filter((b) => b.status === 'pending').length;

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        <Text style={ui.h1}>{merchant ? 'Bookings' : 'My bookings'}</Text>
        <Text style={ui.muted}>
          {merchant
            ? 'Book a customer from their chat with "Book this customer". They confirm in the chat, and get reminders 5 days, 3 days and on the day.'
            : 'Bookings merchants have made for you. You get reminders in your messages 5 days, 3 days and on the day.'}
        </Text>

        {merchant && allowed === false ? (
          <View style={ui.card}>
            <Text style={ui.h2}>The booking app isn't on yet</Text>
            <Text style={ui.muted}>It comes with the Business plan, or as an add-on for Starter and Growth.</Text>
            <Pressable style={[ui.btn, ui.primary]} onPress={() => router.push('/plan')}><Text style={[ui.btnText, { color: '#fff' }]}>See plans</Text></Pressable>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', backgroundColor: colors.field, borderRadius: 12, padding: 4, gap: 4 }}>
              {(['upcoming', 'past'] as const).map((t) => (
                <Pressable key={t} onPress={() => setTab(t)}
                  style={{ flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t ? colors.blue : 'transparent' }}>
                  <Text style={{ fontWeight: '800', color: tab === t ? '#fff' : colors.muted }}>
                    {t === 'upcoming' ? `Upcoming${upcoming.length ? ` (${upcoming.length})` : ''}` : 'Past'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!merchant && pending > 0 && tab === 'upcoming' && (
              <Text style={{ fontWeight: '700', color: '#B07C00' }}>{pending} booking{pending === 1 ? '' : 's'} waiting for you to confirm.</Text>
            )}
            {!rows && !err && <ActivityIndicator color={colors.blue} />}
            {!!err && <Text style={ui.error}>{err}</Text>}
            {rows && !err && list.length === 0 && (
              <Text style={ui.muted}>{tab === 'upcoming' ? 'No upcoming bookings.' : 'No past bookings yet.'}</Text>
            )}
            {list.map((b) => (
              <View key={b.id} style={{ gap: 6 }}>
                <BookingCard b={b} iAmMerchant={merchant} onChanged={load}
                  title={merchant ? customerName(b.customer, b.conversations?.customer_as_business) : b.merchant?.display_name || 'Merchant'}
                  subtitle={b.services?.title} />
                <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: b.conversation_id } })} style={{ alignSelf: 'flex-end' }}>
                  <Text style={{ color: colors.blue, fontWeight: '700' }}>Open chat ›</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
