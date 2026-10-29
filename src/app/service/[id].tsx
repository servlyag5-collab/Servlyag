import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as Photo } from 'expo-image';
import { Cover, photoUrl } from '../../components/Cover';
import { PhotoViewer } from '../../components/PhotoViewer';
import { focusOf, position } from '../../lib/focus';
import { HoursCard } from '../../components/HoursCard';
import { TopBar } from '../../components/Menu';
import { ReportButton } from '../../components/ReportButton';
import { Reviews } from '../../components/Reviews';
import { findConversation, sendFromListing } from '../../lib/chat';
import { useMode } from '../../lib/mode';
import { formatPrice } from '../../lib/price';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, ui } from '../../lib/theme';

type S = { photos: string[]; photo_focus: unknown; merchant_id: string; title: string; description: string; price: number | null; price_from: boolean; show_hours: boolean; hours: unknown; city: string; village: string | null; profiles: { display_name: string; tier_id: string; public_phone: string | null } | null };

// The page structure comes ONLY from the merchant's subscription tier (basic | plus | premium).
// Merchants cannot choose or change it. Edit the three layouts here.
// The business name is a link to the business profile (all their listings and reviews).
function Listing({ s, onBusiness }: { s: S; onBusiness?: () => void }) {
  const tier = s.profiles?.tier_id ?? 'basic';
  const who = s.profiles?.display_name || 'Servly merchant';
  const link = onBusiness ? { textDecorationLine: 'underline' as const, fontWeight: '700' as const } : null;
  const place = `${s.village ? s.village + ', ' : ''}${s.city}`;
  const price = formatPrice(s.price, s.price_from);

  if (tier === 'basic') return (
    <>
      <Text style={ui.h1}>{s.title}</Text>
      <Text style={ui.muted}><Text style={link} onPress={onBusiness}>{who}</Text> · {place}</Text>
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
        <Text style={{ color: '#E6F1FA', fontSize: 16 }}><Text style={link} onPress={onBusiness}>{who}</Text> · {place}</Text>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{price}</Text>
      </View>
      {!!s.description && <Text style={ui.muted}>{s.description}</Text>}
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
  const merchant = useMode() === 'merchant';
  const [s, setS] = useState<S | null>(null);
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [convId, setConvId] = useState<string | null>(null); // my existing conversation about this listing
  const sendAfterLogin = useRef(false);
  const [viewer, setViewer] = useState<number | null>(null); // full-screen photo open (its number), or null

  useEffect(() => {
    supabase.from('services').select('photos,photo_focus,merchant_id,title,description,price,price_from,show_hours,hours,city,village,profiles(display_name,tier_id,public_phone)').eq('id', id).single()
      .then(({ data, error }) => { if (!data) setLoadErr(error?.message ?? 'This listing could not be found.'); setS(data as unknown as S); });
  }, [id]);

  useFocusEffect(useCallback(() => {
    if (session) findConversation(id, session.user.id).then(setConvId);
  }, [id, session?.user.id]));

  // A guest who tapped Send has now logged in: send the note they typed.
  useEffect(() => {
    if (session && sendAfterLogin.current) { sendAfterLogin.current = false; send(); }
  }, [session]);

  // Starts my conversation about this listing (or adds to it), then opens the chat.
  async function send() {
    if (!body.trim()) return setMsg('Please write a note for the merchant.');
    // Guests sign up first; the note stays on this page and is sent when they come back.
    if (!session) { sendAfterLogin.current = true; return router.push({ pathname: '/login', params: { mode: 'up' } }); }
    if (s && session.user.id === s.merchant_id) return setMsg('This is your own listing.');
    setBusy(true); setMsg('');
    try {
      const conv = await sendFromListing(id, session.user.id, body.trim(), contact.trim(), merchant);
      setBody(''); setConvId(conv);
      router.push({ pathname: '/chat/[id]', params: { id: conv } });
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  // The owner, in merchant view, sees a preview: same page as customers, but nothing can be pressed or typed.
  const preview = !!s && merchant && session?.user.id === s.merchant_id;
  const screen = useWindowDimensions();
  const wide = screen.width >= 900; // computers: photo banner across the top, then two columns

  if (!s) return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        {loadErr ? <Text style={ui.error}>{loadErr}</Text> : <ActivityIndicator color={colors.blue} />}
      </ScrollView>
    </SafeAreaView>
  );

  // The pieces of the page (laid out below for phones or computers).
  const previewBanner = preview && (
    <View style={[ui.card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderColor: colors.blue, borderWidth: 2 }]}>
      <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink }}>This is how customers see your listing</Text>
      <Pressable style={[ui.btn, ui.primary, { height: 44 }]} onPress={() => router.push({ pathname: '/edit/[id]', params: { id } })}>
        <Text style={[ui.btnText, { color: '#fff' }]}>Edit listing</Text>
      </Pressable>
    </View>
  );
  const details = (
    <>
      <Listing s={s} onBusiness={preview ? undefined : () => router.push({ pathname: '/business/[id]', params: { id: s.merchant_id } })} />
      {s.show_hours && <HoursCard hours={s.hours} />}
      {/* Tap any photo: the whole photo full screen; swipe between them, × to close. */}
      <PhotoViewer urls={(s.photos ?? []).map(photoUrl)} start={viewer} onClose={() => setViewer(null)} />
      {s.photos?.length > 1 && (
        <>
          <Text style={[ui.h2, { marginTop: 8 }]}>Our work</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {s.photos.slice(1).map((p, i) => (
              <Pressable key={p} onPress={() => setViewer(i + 1)} accessibilityLabel={`Open photo ${i + 2} full screen`}>
                <Photo source={{ uri: photoUrl(p) }} contentFit="cover" contentPosition={position(focusOf(s.photo_focus, p))} transition={150}
                  style={{ width: wide ? 360 : 280, height: wide ? 225 : 175, borderRadius: 14, backgroundColor: colors.field }} />
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
      {/* Only the newest review here; "Read all N reviews" opens the full list. */}
      <Reviews merchantId={s.merchant_id} serviceId={id} limit={1} allowWrite={!preview} />
      {!preview && session?.user.id !== s.merchant_id && (
        <View style={{ alignItems: 'flex-end' }}><ReportButton targetType="listing" targetId={id} label="Report this listing" /></View>
      )}
    </>
  );
  const contactForm = (
    <>
      <Text style={[ui.h2, { marginTop: 4 }]}>Send a note</Text>
      {!!convId && !preview && (
        <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: convId } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="chatbubbles-outline" size={18} color={colors.blue} />
          <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>Continue your conversation</Text>
        </Pressable>
      )}
      <TextInput style={[ui.field, { height: 110, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="Write your note to the merchant" multiline value={body} onChangeText={setBody} editable={!preview} />
      <TextInput style={ui.field} placeholder="Your phone or WhatsApp number (optional)" keyboardType="phone-pad" value={contact} onChangeText={setContact} editable={!preview} />
      {!!msg && <Text style={ui.error}>{msg}</Text>}
      {!session && <Text style={ui.muted}>You'll create a free account first, then your note is sent.</Text>}
      {/* Call and Send note side by side at the bottom. */}
      <View style={ui.row}>
        {!!s.profiles?.public_phone && (
          <Pressable style={[ui.btn, ui.outline, { flex: 1, flexDirection: 'row', gap: 8 }]} disabled={preview} onPress={() => Linking.openURL(`tel:${s.profiles!.public_phone}`)}>
            <Ionicons name="call-outline" size={20} color={colors.blue} />
            <Text style={[ui.btnText, { color: colors.ink }]}>Call</Text>
          </Pressable>
        )}
        <Pressable style={[ui.btn, ui.primary, { flex: 1, flexDirection: 'row', gap: 8 }]} onPress={send} disabled={busy || preview}>
          {busy ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={[ui.btnText, { color: '#fff' }]}>{session ? 'Send note' : 'Sign up & send'}</Text>
            </>
          )}
        </Pressable>
      </View>
    </>
  );

  // Computers: the cover photo across the top at its own shape (never stretched or cut), over a soft
  // blurred copy of itself; then details on the left and "Send a note" on the right.
  if (wide) {
    const cover = s.photos?.[0];
    const bannerH = Math.round(Math.min(560, screen.height * 0.6));
    return (
      <SafeAreaView style={ui.screen}>
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 56, paddingVertical: 14 }}><TopBar /></View>
          {!!cover && (
            <View style={{ height: bannerH, backgroundColor: colors.harbour, overflow: 'hidden' }}>
              <Image source={{ uri: photoUrl(cover) }} blurRadius={40} resizeMode="cover"
                style={{ position: 'absolute', top: -40, left: -40, right: -40, bottom: -40 }} />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 58, 99, 0.35)' }} />
              <Pressable onPress={() => setViewer(0)} accessibilityLabel="Open photos full screen" style={{ width: '100%', height: '100%' }}>
                <Image source={{ uri: photoUrl(cover) }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
              </Pressable>
            </View>
          )}
          <View style={{ paddingHorizontal: 56, paddingTop: 28, flexDirection: 'row', alignItems: 'flex-start', gap: 40 }}>
            <View style={{ flex: 1.7, minWidth: 0, gap: 14 }}>
              {previewBanner}
              {details}
            </View>
            <View style={[ui.card, { flex: 1, maxWidth: 480, minWidth: 320, gap: 12, boxShadow: '0px 12px 32px rgba(11, 58, 99, 0.12)' }]}>
              {contactForm}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Phones and small screens.
  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        {previewBanner}
        {/* Photo 1 is the cover (logo or best photo); photos 2-5 show the merchant's work. */}
        {/* Same 16:10 shape as the Home cards, showing the part the merchant chose; tap for the whole photo. */}
        {s.photos?.length > 0 && (
          <Pressable onPress={() => setViewer(0)} accessibilityLabel="Open photos full screen">
            <Cover photos={s.photos} focus={s.photo_focus} title={s.title} width="100%" aspectRatio={1.6} />
          </Pressable>
        )}
        {details}
        {contactForm}
      </ScrollView>
    </SafeAreaView>
  );
}
