import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, ui } from '../../lib/theme';

type S = { photos: string[]; merchant_id: string; title: string; description: string; tags: string[]; price: number | null; city: string; village: string | null; profiles: { display_name: string; tier_id: string; phone: string | null } | null };

// The page structure comes ONLY from the merchant's subscription tier (basic | plus | premium).
// Merchants cannot choose or change it. Edit the three layouts here.
function Listing({ s }: { s: S }) {
  const tier = s.profiles?.tier_id ?? 'basic';
  const who = s.profiles?.display_name || 'Servly merchant';
  const place = `${s.village ? s.village + ', ' : ''}${s.city}`;
  const price = s.price != null ? `EC$${s.price}` : 'Ask for price';
  const tags = s.tags.length > 0 && (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {s.tags.map((t) => <Text key={t} style={{ backgroundColor: colors.field, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, color: colors.ink }}>#{t}</Text>)}
    </View>
  );

  if (tier === 'basic') return (
    <>
      <Text style={ui.h1}>{s.title}</Text>
      <Text style={ui.muted}>{who} · {place}</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.blue }}>{price}</Text>
      {!!s.description && <Text style={ui.muted}>{s.description}</Text>}
    </>
  );

  return (
    <>
      <View style={[ui.card, { backgroundColor: colors.blue, borderColor: colors.blue }]}>
        {tier === 'premium' && (
          <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ flex: 1, backgroundColor: colors.red }} /><View style={{ flex: 1, backgroundColor: colors.black }} /><View style={{ flex: 1, backgroundColor: colors.gold }} />
          </View>
        )}
        <Text style={[ui.h1, { color: '#fff' }]}>{s.title}</Text>
        <Text style={{ color: '#E6F1FA', fontSize: 16 }}>{who} · {place}</Text>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{price}</Text>
      </View>
      {!!s.description && <Text style={ui.muted}>{s.description}</Text>}
      {tags}
      {tier === 'premium' && (
        <View style={ui.card}>
          <Text style={{ fontWeight: '800', fontSize: 18, color: colors.ink }}>About {who}</Text>
          <Text style={ui.muted}>Serving {place}. Send a note below and the merchant will get back to you.</Text>
        </View>
      )}
    </>
  );
}

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const [s, setS] = useState<S | null>(null);
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState(false);
  const sendAfterLogin = useRef(false);

  useEffect(() => {
    supabase.from('services').select('photos,merchant_id,title,description,tags,price,city,village,profiles(display_name,tier_id,phone)').eq('id', id).single()
      .then(({ data }) => setS(data as unknown as S));
  }, [id]);

  // A guest who tapped Send has now logged in: send the note they typed.
  useEffect(() => {
    if (session && sendAfterLogin.current) { sendAfterLogin.current = false; send(); }
  }, [session]);

  async function send() {
    if (!body.trim()) return setMsg('Please write a note for the merchant.');
    if (!contact.trim()) return setMsg('Add a phone or WhatsApp number so the merchant can reply.');
    // Guests sign up first; the note stays on this page and is sent when they come back.
    if (!session) { sendAfterLogin.current = true; return router.push({ pathname: '/login', params: { mode: 'up' } }); }
    setBusy(true); setMsg('');
    const { error } = await supabase.from('notes').insert({ service_id: id, customer_id: session.user.id, body: body.trim(), contact: contact.trim() });
    setBusy(false);
    if (error) setMsg(error.message); else setSent(true);
  }

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>← Back</Text></Pressable>
        {!s ? <ActivityIndicator color={colors.blue} /> : (
          <>
            <Listing s={s} />
            {s.photos?.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {s.photos.map((p) => <Image key={p} source={{ uri: supabase.storage.from('service-photos').getPublicUrl(p).data.publicUrl }} style={{ width: 280, height: 200, borderRadius: 14 }} />)}
              </ScrollView>
            )}
            <View style={ui.row}>
              {!!s.profiles?.phone && (
                <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={() => Linking.openURL(`tel:${s.profiles!.phone}`)}>
                  <Text style={[ui.btnText, { color: colors.ink }]}>Call</Text>
                </Pressable>
              )}
              <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={() => router.push({ pathname: '/business/[id]', params: { id: s.merchant_id } })}>
                <Text style={[ui.btnText, { color: colors.ink }]}>Business profile</Text>
              </Pressable>
            </View>
            <Text style={[ui.h2, { marginTop: 12 }]}>Send a note</Text>
            {sent ? <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>Note sent. The merchant will get back to you.</Text> : (
              <>
                <TextInput style={[ui.field, { height: 110, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="Write your note to the merchant" multiline value={body} onChangeText={setBody} />
                <TextInput style={ui.field} placeholder="Your phone or WhatsApp number" keyboardType="phone-pad" value={contact} onChangeText={setContact} />
                {!!msg && <Text style={ui.error}>{msg}</Text>}
                {!session && <Text style={ui.muted}>You'll create a free account first, then your note is sent.</Text>}
                <Pressable style={[ui.btn, ui.primary]} onPress={send} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>{session ? 'Send note' : 'Sign up and send note'}</Text>}
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
