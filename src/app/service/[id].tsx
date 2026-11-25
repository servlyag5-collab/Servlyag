import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
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
import { callBusiness } from '../../lib/calls';
import { findConversation, sendFromListing } from '../../lib/chat';
import { normalizeHours, openStatus, useNow } from '../../lib/hours';
import { useMode } from '../../lib/mode';
import { formatPrice } from '../../lib/price';
import { fetchListingRatings, type Rating } from '../../lib/reviews';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, flag, ui } from '../../lib/theme';
import { PinLoader } from '../../components/PinLoader';
import { listingName } from '../../lib/names';
import { FOUNDERS_PREVIEW, PREVIEW_NOTICE } from '../../lib/preview';

type S = { active: boolean; paused: boolean; deleted_at: string | null; photos: string[]; photo_focus: unknown; merchant_id: string; title: string; description: string; price: number | null; price_from: boolean; show_hours: boolean; hours: unknown; city: string; village: string | null; listed_as: string | null; profiles: { display_name: string; tier_id: string; public_phone: string | null; plan_expires_at: string | null; bio: string | null } | null };
type Other = { id: string; title: string; photos: string[]; photo_focus: unknown; price: number | null; price_from: boolean };
type Tier = 'basic' | 'plus' | 'premium';

// The three listing pages (owner's choice 2026-11-17, design: docs/design/listing-layouts-proposal.png). The page comes
// ONLY from the merchant's plan, which merchants can't choose; nothing on the page names the plan.
//   Starter (basic):    clean and trustworthy: cover, details, hours, small "Our work" photos, newest review.
//   Growth (plus):      a showcase: swipe-through photos, big photo grid, 2 reviews.
//   Business (premium): a feature page: big swipeable photos with the name on them, full flag stripe, "About", grid,
//                       reviews, "More from" their other services.
// Every plan keeps every trust signal (photos, rating, reviews, place, hours, Call and Send a note): higher plans
// get more showcase, never more trust. Bookings still start from the chat (the merchant sends the booking).
const tierOf = (s: S): Tier => (['plus', 'premium'].includes(s.profiles?.tier_id ?? '') ? s.profiles!.tier_id as Tier : 'basic');

function FlagRibbon({ height = 5 }: { height?: number }) {
  return <View style={{ flexDirection: 'row', height }}>{flag.map((f, i) => <View key={i} style={{ flex: f.flex, backgroundColor: f.color }} />)}</View>;
}

// Stars, score and number of reviews ("New" before the first review), plus "Open now" while the hours say so.
function RatingLine({ rating, open, light = false }: { rating?: Rating; open: boolean; light?: boolean }) {
  const has = !!rating && rating.total > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      {has ? (
        <>
          <Text style={{ color: '#E8A600', fontSize: 16, letterSpacing: 1 }} accessibilityLabel={`${rating!.average.toFixed(1)} out of 5 stars`}>
            {'★'.repeat(Math.max(1, Math.round(rating!.average)))}{'☆'.repeat(5 - Math.max(1, Math.round(rating!.average)))}
          </Text>
          <Text style={{ fontWeight: '800', fontSize: 16, color: light ? '#fff' : colors.ink }}>{rating!.average.toFixed(1)}</Text>
          <Text style={{ fontSize: 15, color: light ? '#E6F1FA' : colors.muted }}>({rating!.total} review{rating!.total === 1 ? '' : 's'})</Text>
        </>
      ) : <Text style={{ fontSize: 15, fontWeight: '700', color: light ? '#E6F1FA' : colors.muted }}>New</Text>}
      {open && (
        <Text style={{ backgroundColor: '#FFF4C2', color: '#7A5B00', fontWeight: '800', fontSize: 13, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, overflow: 'hidden' }}>Open now</Text>
      )}
    </View>
  );
}

// Title, business name (a link to the business profile), place, rating and price.
function Header({ s, rating, open, onBusiness, showTitle = true }: { s: S; rating?: Rating; open: boolean; onBusiness?: () => void; showTitle?: boolean }) {
  const who = listingName(s.listed_as, s.profiles?.display_name); // v40: a side business can show its own name
  const place = `${s.village ? s.village + ', ' : ''}${s.city}`;
  return (
    <View style={{ gap: 6 }}>
      {showTitle && <Text style={ui.h1}>{s.title}</Text>}
      {showTitle && (
        <Text style={ui.muted}>
          <Text style={onBusiness ? { textDecorationLine: 'underline', fontWeight: '700', color: colors.ink } : null} onPress={onBusiness}>{who}</Text> · {place}
        </Text>
      )}
      <RatingLine rating={rating} open={open} />
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.blue }}>{formatPrice(s.price, s.price_from)}</Text>
    </View>
  );
}

// Photos 2-5. Tap one for the whole photo.
//   Starter: always open, a row of small squares (the only place its work shows).
//   Growth and Business (`grid`): the photos already swipe at the top, so "Our work" starts closed as a teaser: the
//   small row plus "See all"; tapping opens the big 2 x 2 grid, "Show less" closes it (owner, 2026-11-18).
function OurWork({ s, grid, onOpen }: { s: S; grid: boolean; onOpen: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const work = (s.photos ?? []).slice(1, 5);
  if (!work.length) return null;
  const big = grid && open;
  const toggle = grid && (
    <Pressable onPress={() => setOpen(!open)} hitSlop={8} accessibilityRole="button"
      accessibilityLabel={open ? 'Show fewer photos' : `See all ${work.length} photos of our work`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>{open ? 'Show less' : 'See all'}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.blue} />
    </Pressable>
  );
  return (
    <View style={[ui.card, { gap: 10, padding: 16 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[ui.h2, { flex: 1 }]}>Our work{grid ? <Text style={{ fontSize: 16, color: colors.muted, fontWeight: '600' }}>  · {work.length} photo{work.length === 1 ? '' : 's'}</Text> : null}</Text>
        {toggle}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: big ? 'wrap' : 'nowrap', gap: 8 }}>
        {work.map((p, i) => (
          <Pressable key={p} onPress={() => onOpen(i + 1)} accessibilityLabel={`Open photo ${i + 2} full screen`}
            style={big ? { width: '48.5%', flexGrow: 1 } : { flex: 1, maxWidth: '25%' }}>
            <Photo source={{ uri: photoUrl(p) }} contentFit="cover" contentPosition={position(focusOf(s.photo_focus, p))} transition={150}
              style={{ width: '100%', aspectRatio: big ? 1.15 : 1, borderRadius: big ? 14 : 12, backgroundColor: colors.field }} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const counterStyle = { position: 'absolute' as const, right: 12, backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 13, fontWeight: '700' as const, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' as const };

// Growth: all the photos, swipe from one to the next ("2 / 5"); tap for the whole photo.
function PhotoCarousel({ s, onOpen }: { s: S; onOpen: (n: number) => void }) {
  const [w, setW] = useState(0);
  const [at, setAt] = useState(0);
  const photos = s.photos ?? [];
  if (!photos.length) return null;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: colors.field }}>
      {w > 0 && (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={32}
          onScroll={(e) => setAt(Math.round(e.nativeEvent.contentOffset.x / w))}>
          {photos.map((p, k) => (
            <Pressable key={p} onPress={() => onOpen(k)} accessibilityLabel={`Photo ${k + 1} of ${photos.length}, open full screen`}>
              <Photo source={{ uri: photoUrl(p) }} contentFit="cover" contentPosition={position(focusOf(s.photo_focus, p))} transition={150}
                style={{ width: w, height: Math.round(w / 1.45) }} />
            </Pressable>
          ))}
        </ScrollView>
      )}
      {photos.length > 1 && <Text style={[counterStyle, { bottom: 12 }]}>{at + 1} / {photos.length}</Text>}
    </View>
  );
}

// Business: all the photos across the whole width (swipe from one to the next, "2 / 5"), with the title and
// business name on top, then the flag stripe. Tap a photo for the whole photo.
function Hero({ s, onBusiness, onOpen }: { s: S; onBusiness?: () => void; onOpen: (n: number) => void }) {
  const [w, setW] = useState(0);
  const [at, setAt] = useState(0);
  const photos = s.photos ?? [];
  const who = listingName(s.listed_as, s.profiles?.display_name); // v40: a side business can show its own name
  const place = `${s.village ? s.village + ', ' : ''}${s.city}`;
  return (
    <View style={{ marginHorizontal: -16 }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 320, backgroundColor: colors.harbour }}>
        {w > 0 && photos.length > 0 && (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={32}
            onScroll={(e) => setAt(Math.round(e.nativeEvent.contentOffset.x / w))}>
            {photos.map((p, k) => (
              <Pressable key={p} onPress={() => onOpen(k)} accessibilityLabel={`Photo ${k + 1} of ${photos.length}, open full screen`}>
                <Photo source={{ uri: photoUrl(p) }} contentFit="cover" contentPosition={position(focusOf(s.photo_focus, p))} transition={150}
                  style={{ width: w, height: 320 }} />
              </Pressable>
            ))}
          </ScrollView>
        )}
        {/* Darker towards the bottom so the white words always stand out; swipes and taps pass through it. */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%', backgroundColor: 'rgba(5,25,45,0.22)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%', backgroundColor: 'rgba(5,25,45,0.32)' }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '22%', backgroundColor: 'rgba(5,25,45,0.3)' }} />
        {photos.length > 1 && <Text pointerEvents="none" style={[counterStyle, { top: 14 }]}>{at + 1} / {photos.length}</Text>}
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: 16, gap: 4 }}>
          <Text pointerEvents="none" style={[ui.h1, { color: '#fff', fontSize: 28 }]}>{s.title}</Text>
          <Text style={{ color: '#E6F1FA', fontSize: 16 }}>
            <Text style={onBusiness ? { textDecorationLine: 'underline', fontWeight: '800', color: '#fff' } : { fontWeight: '800', color: '#fff' }} onPress={onBusiness}>{who}</Text> · {place}
          </Text>
        </View>
      </View>
      <FlagRibbon />
    </View>
  );
}

// Business: their other live services, so a customer who likes one can find the rest.
function MoreFrom({ s, id }: { s: S; id: string }) {
  const [rows, setRows] = useState<Other[] | null>(null);
  useEffect(() => {
    supabase.from('services').select('id,title,photos,photo_focus,price,price_from').eq('merchant_id', s.merchant_id).neq('id', id)
      .eq('active', true).eq('paused', false).is('deleted_at', null).order('created_at').limit(3)
      .then(({ data }) => setRows((data as Other[]) ?? []));
  }, [s.merchant_id, id]);
  if (!rows?.length) return null;
  return (
    <View style={[ui.card, { gap: 10, padding: 16 }]}>
      <Text style={ui.h2}>More from {s.profiles?.display_name || 'this business'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {rows.map((o) => (
          <Pressable key={o.id} onPress={() => router.push({ pathname: '/service/[id]', params: { id: o.id } })} style={{ width: 160, gap: 4 }}
            accessibilityLabel={`Open ${o.title}`}>
            <Cover photos={o.photos} focus={o.photo_focus} title={o.title} width={160} aspectRatio={1.6} radius={12} />
            <Text style={{ fontWeight: '700', color: colors.ink }} numberOfLines={2}>{o.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 14 }}>{formatPrice(o.price, o.price_from)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
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
  const [rating, setRating] = useState<Rating | undefined>(undefined);
  const now = useNow(); // "Open now" changes by itself at opening and closing time

  useEffect(() => {
    // Customers only get live listings; the owner and admins (v27) also get turned-off, paused and expired ones.
    supabase.from('services').select('active,paused,deleted_at,photos,photo_focus,merchant_id,title,description,price,price_from,show_hours,hours,city,village,listed_as,profiles(display_name,tier_id,public_phone,plan_expires_at,bio)').eq('id', id).maybeSingle()
      .then(({ data, error }) => {
        if (error) setLoadErr('Something went wrong loading this listing. Please try again.');
        else if (!data) setLoadErr('This listing isn\'t available right now. The business may have turned it off, or its plan may have ended.');
        setS(data as unknown as S);
      });
    fetchListingRatings([id]).then((r) => setRating(r[id]));
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
        {loadErr ? <Text style={ui.error}>{loadErr}</Text> : <PinLoader />}
      </ScrollView>
    </SafeAreaView>
  );

  const tier = tierOf(s);
  const rich = tier !== 'basic'; // Growth and Business
  const open = s.show_hours && openStatus(normalizeHours(s.hours), now).open;
  const onBusiness = preview ? undefined : () => router.push({ pathname: '/business/[id]', params: { id: s.merchant_id } });
  const phone = s.profiles?.public_phone;
  const call = () => phone && callBusiness(phone, s.merchant_id, id, session?.user.id);

  // The pieces of the page (laid out below for phones or computers).
  const previewBanner = preview && (
    <View style={[ui.card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderColor: colors.blue, borderWidth: 2 }]}>
      <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink }}>This is how customers see your listing</Text>
      <Pressable style={[ui.btn, ui.primary, { height: 44 }]} onPress={() => router.push({ pathname: '/edit/[id]', params: { id } })}>
        <Text style={[ui.btnText, { color: '#fff' }]}>Edit listing</Text>
      </Pressable>
    </View>
  );
  // Only the owner and admins can open a listing customers can't see: say why customers can't see it.
  const ended = !s.profiles?.plan_expires_at || new Date(s.profiles.plan_expires_at) <= new Date();
  const hiddenWhy = s.deleted_at ? 'Deleted: this listing no longer exists for customers.'
    : !s.active ? 'Turned off: customers can\'t see this listing.'
    : s.paused ? 'Paused (over the plan\'s listing limit): customers can\'t see this listing.'
    : ended ? 'Plan ended: customers can\'t see this listing until the plan is renewed.' : '';
  const hiddenBanner = !!hiddenWhy && (
    <View style={[ui.card, { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderColor: colors.red, borderWidth: 2 }]}>
      <Ionicons name="eye-off-outline" size={22} color={colors.red} />
      <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink }}>{hiddenWhy}</Text>
    </View>
  );
  const hours = s.show_hours && <HoursCard hours={s.hours} />;
  const about = tier === 'premium' && !!s.profiles?.bio?.trim() && (
    <View style={[ui.card, { gap: 6, padding: 16 }]}>
      <Text style={ui.h2}>About {s.profiles?.display_name || 'us'}</Text>
      <Text style={ui.muted}>{s.profiles!.bio}</Text>
    </View>
  );
  const takesBookings = tier === 'premium' && (
    <View style={{ flexDirection: 'row' }}>
      <Text style={{ borderWidth: 1.5, borderColor: colors.blue, color: colors.blue, fontWeight: '700', fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>Takes bookings</Text>
    </View>
  );
  // Everything below the photos: the same pieces for every plan, more of them (and bigger) for Growth and Business.
  const details = (
    <>
      <Header s={s} rating={rating} open={!!open} onBusiness={onBusiness} showTitle={!(tier === 'premium' && !wide)} />
      {takesBookings}
      {!!s.description && <Text style={ui.muted}>{s.description}</Text>}
      {about}
      {!rich && hours}
      {/* Tap any photo: the whole photo full screen; swipe between them, × to close. */}
      <PhotoViewer urls={(s.photos ?? []).map(photoUrl)} start={viewer} onClose={() => setViewer(null)} />
      <OurWork s={s} grid={rich} onOpen={setViewer} />
      {/* Starter: the newest review; Growth and Business: the two newest. "Read all N reviews" opens the rest. */}
      <Reviews merchantId={s.merchant_id} serviceId={id} limit={rich ? 2 : 1} allowWrite={!preview} title={rich ? 'What customers say' : 'Reviews'} />
      {rich && hours}
      {tier === 'premium' && <MoreFrom s={s} id={id} />}
      {!preview && session?.user.id !== s.merchant_id && (
        <View style={{ alignItems: 'flex-end' }}><ReportButton targetType="listing" targetId={id} label="Report this listing" /></View>
      )}
    </>
  );
  // Founders website (preview): no note box, Send or Call; a notice instead (src/lib/preview.ts).
  const previewNotice = (
    <View style={[ui.card, { gap: 8, borderColor: colors.gold, borderWidth: 2 }]}>
      <Text style={ui.h2}>Send a note</Text>
      <Text style={ui.muted}>{PREVIEW_NOTICE}</Text>
    </View>
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
      <TextInput placeholderTextColor={colors.muted} style={[ui.field, { height: 110, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="Write your note to the merchant" multiline value={body} onChangeText={setBody} editable={!preview} />
      <TextInput placeholderTextColor={colors.muted} style={ui.field} placeholder="Your phone or WhatsApp number (optional)" keyboardType="phone-pad" value={contact} onChangeText={setContact} editable={!preview} />
      {!!msg && <Text style={ui.error}>{msg}</Text>}
      {!session && <Text style={ui.muted}>You'll create a free account first, then your note is sent.</Text>}
      {/* Call and Send note side by side at the bottom. */}
      <View style={ui.row}>
        {!!phone && (
          <Pressable style={[ui.btn, ui.outline, { flex: 1, flexDirection: 'row', gap: 8 }]} disabled={preview} onPress={call}>
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
  // blurred copy of itself (Business: with the flag stripe under it); then details left and "Send a note" right.
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
          {tier === 'premium' && <FlagRibbon height={6} />}
          <View style={{ paddingHorizontal: 56, paddingTop: 28, flexDirection: 'row', alignItems: 'flex-start', gap: 40 }}>
            <View style={{ flex: 1.7, minWidth: 0, gap: 14 }}>
              {previewBanner}
              {hiddenBanner}
              {details}
            </View>
            <View style={[ui.card, { flex: 1, maxWidth: 480, minWidth: 320, gap: 12, boxShadow: '0px 12px 32px rgba(11, 58, 99, 0.12)' }]}>
              {FOUNDERS_PREVIEW ? previewNotice : contactForm}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Phones and small screens.
  return (
    <SafeAreaView style={ui.screen}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
          <TopBar />
          {previewBanner}
          {hiddenBanner}
          {/* Photo 1 is the cover (logo or best photo); photos 2-5 show the merchant's work. Tap for the whole photo. */}
          {tier === 'premium' ? <Hero s={s} onBusiness={onBusiness} onOpen={setViewer} />
            : tier === 'plus' ? <PhotoCarousel s={s} onOpen={setViewer} />
            : s.photos?.length > 0 && (
              <Pressable onPress={() => setViewer(0)} accessibilityLabel="Open photos full screen">
                <Cover photos={s.photos} focus={s.photo_focus} title={s.title} width="100%" aspectRatio={1.6} />
              </Pressable>
            )}
          {details}
          {/* Send a note and Call: once, at the end of the page (owner, 2026-11-18: no extra bar at the bottom). */}
          {FOUNDERS_PREVIEW ? previewNotice : contactForm}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
