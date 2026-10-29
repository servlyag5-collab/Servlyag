import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTimePicker, type Pick } from '../../components/DateTimePicker';
import { WideSplit } from '../../components/WideSplit';
import { TopBar } from '../../components/Menu';
import { bookingWhen, fromAntigua, hasBookingApp } from '../../lib/bookings';
import { formatPrice } from '../../lib/price';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { customerName } from '../../lib/names';
import { colors, ui } from '../../lib/theme';
import { PinLoader } from '../../components/PinLoader';

type Conv = { merchant_id: string; services: { title: string } | null; customer_as_business: boolean; customer: { display_name: string; screen_name: string } | null };

// The merchant books the customer from their chat: pick a date and time, then send for confirmation.
export default function BookCustomer() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const session = useSession();
  const uid = session?.user.id;
  const [c, setC] = useState<Conv | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [when, setWhen] = useState<Pick>(null);
  const [note, setNote] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!uid) return;
    supabase.from('conversations').select('merchant_id,customer_as_business,services(title),customer:profiles!customer_id(display_name,screen_name)').eq('id', conversationId).maybeSingle()
      .then(({ data }) => setC(data as unknown as Conv | null));
    hasBookingApp().then(setAllowed);
  }, [conversationId, uid]);

  const ready = !!when && when.h >= 0;
  const startsAt = ready ? fromAntigua(when!.y, when!.m, when!.d, when!.h, when!.min) : null;

  async function send() {
    if (!startsAt) return setMsg('Choose a date and a time.');
    if (price.trim() && isNaN(Number(price))) return setMsg('Price must be a number.');
    setBusy(true); setMsg('');
    const { error } = await supabase.from('bookings').insert({
      conversation_id: conversationId, starts_at: startsAt, note: note.trim(), price: price.trim() ? Number(price) : null,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    router.back(); // back to the chat, where the booking card now waits for the customer
  }

  const iAmMerchant = !!c && c.merchant_id === uid;
  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        <WideSplit>
        <Text style={ui.h1}>Book this customer</Text>
        {(!c || allowed === null) ? <PinLoader /> : !iAmMerchant ? (
          <Text style={ui.muted}>Only the merchant can book from this chat.</Text>
        ) : !allowed ? (
          <View style={ui.card}>
            <Text style={ui.h2}>The booking app isn't on yet</Text>
            <Text style={ui.muted}>It comes with the Business plan, or as an add-on for Starter and Growth. Choose it on the Plan screen.</Text>
            <Pressable style={[ui.btn, ui.primary]} onPress={() => router.push('/plan')}><Text style={[ui.btnText, { color: '#fff' }]}>See plans</Text></Pressable>
          </View>
        ) : (
          <>
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{customerName(c.customer, c.customer_as_business)}</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.blue }}>{c.services?.title ?? 'Your listing'}</Text>
            </View>
            <View style={ui.card}>
              <DateTimePicker value={when} onChange={(v) => { setWhen(v); setMsg(''); }} />
            </View>
            <View style={ui.card}>
              <TextInput style={[ui.field, { height: 90, paddingTop: 14, textAlignVertical: 'top' }]} multiline maxLength={500}
                placeholder="Note for the customer (optional), e.g. Wash, cut and style" value={note} onChangeText={setNote} />
              <TextInput style={ui.field} placeholder="Price in EC$ (optional)" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
            </View>
            {ready && (
              <View style={[ui.card, { borderColor: colors.blue, borderWidth: 2 }]}>
                <Text style={{ color: colors.blue, fontWeight: '800', letterSpacing: 2, fontSize: 12 }}>THE CUSTOMER WILL BE ASKED TO CONFIRM</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{bookingWhen(startsAt!)}</Text>
                {!!note.trim() && <Text style={ui.muted}>{note.trim()}</Text>}
                {!!price.trim() && !isNaN(Number(price)) && <Text style={{ fontWeight: '800', color: colors.blue }}>{formatPrice(Number(price))}</Text>}
              </View>
            )}
            {!!msg && <Text style={ui.error}>{msg}</Text>}
            <Pressable style={[ui.btn, ui.primary, !ready && { opacity: 0.5 }]} onPress={send} disabled={busy || !ready}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Send for confirmation</Text>}
            </Pressable>
          </>
        )}
        </WideSplit>
      </ScrollView>
    </SafeAreaView>
  );
}
