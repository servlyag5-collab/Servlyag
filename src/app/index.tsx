import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListingRow, type CardListing } from '../components/ListingRow';
import { FlagFrame } from '../components/FlagFrame';
import { LegalLinks } from '../components/LegalLinks';
import { MenuButton } from '../components/Menu';
import { PlanBanner } from '../components/PlanBanner';
import { fetchListingRatings, type Rating } from '../lib/reviews';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type Row = CardListing & { priority: number };
const EMPTY = { q: '', city: '', village: '' };
const PAGE = 30; // results loaded at a time
const LOGO_W = 240;             // width of the logo at the top of Home
const LOGO_RATIO = 549 / 2066;  // logo.png height / width
// Home rows, by search priority (from the merchant's tier: Business 2, Growth 1, Starter 0).
const ROWS = [
  { title: 'Top businesses', match: (p: number) => p >= 2 },
  { title: 'Popular picks', match: (p: number) => p === 1 },
  { title: 'More local services', match: (p: number) => p <= 0 },
];

export default function Home() {
  const session = useSession();
  const uid = session?.user.id;
  const [name, setName] = useState('');
  const [f, setF] = useState(EMPTY);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState(EMPTY); // the search the results belong to (for "Show more")
  const sc = useRef<ScrollViewInstance>(null);
  const resultsY = useRef(0);
  const set = (k: keyof typeof EMPTY) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { run(EMPTY, false); }, []);

  // Re-runs when someone logs in or out, so the header always matches.
  useEffect(() => {
    if (!session) { setName(''); return; }
    supabase.from('profiles').select('display_name').eq('id', session.user.id).single()
      .then(({ data: p }) => setName(p?.display_name || session.user.email || ''));
  }, [uid]);

  // Search in the database (search_services): name, description and hidden tags, tolerant of small
  // spelling mistakes; Business first, then Growth, then Starter. Loads PAGE results at a time.
  async function run(x: typeof EMPTY, scroll: boolean, more = false) {
    setErr('');
    setBusy(true);
    const from = more ? (rows?.length ?? 0) : 0;
    const { data, error } = await supabase
      .rpc('search_services', { p_q: x.q.replace(/[%_\\]/g, ' ').trim(), p_city: x.city.trim(), p_village: x.village.trim() })
      .select('id,merchant_id,title,photos,price,price_from,priority,city,village,profiles(display_name)')
      .range(from, from + PAGE - 1);
    setBusy(false);
    if (error) return setErr('Something went wrong. Please try again.');
    const page = (data as unknown as Row[]) ?? [];
    const list = more ? [...(rows ?? []), ...page] : page;
    setRows(list);
    setHasMore(page.length === PAGE);
    setQuery(x);
    fetchListingRatings(list.map((r) => r.id)).then(setRatings);
    if (scroll) setTimeout(() => sc.current?.scrollTo({ y: resultsY.current, animated: true }), 60);
  }
  const search = () => run(f, true);
  const clear = () => { setF(EMPTY); run(EMPTY, false); };

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView ref={sc} contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        {/* The logo picture in two parts: the full map pin, and the name cropped just below its flag underline.
            The tagline is real text (not part of the picture) so it stays readable on phones. */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: LOGO_W * 0.06 }}>
          <View style={{ width: LOGO_W * 0.215, height: LOGO_W * LOGO_RATIO, overflow: 'hidden' }}>
            <Image source={require('../../assets/logo.png')} style={{ width: LOGO_W, height: LOGO_W * LOGO_RATIO }} />
          </View>
          <View style={{ gap: 4, flexShrink: 1 }}>
            <View style={{ width: LOGO_W * 0.725, height: LOGO_W * LOGO_RATIO * 0.63, overflow: 'hidden' }}>
              <Image source={require('../../assets/logo.png')} style={{ width: LOGO_W, height: LOGO_W * LOGO_RATIO, marginLeft: -LOGO_W * 0.275 }} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted }}>Whatever you need, someone's ready.</Text>
          </View>
        </View>
        <View style={[ui.row, { alignItems: 'center' }]}>
          <Text style={{ flex: 1, color: colors.muted, fontSize: 16 }} numberOfLines={1}>{session ? name : 'Browsing as a guest'}</Text>
          {session ? <MenuButton /> : (
            <Pressable onPress={() => router.push('/login')} style={[ui.row, { alignItems: 'center', gap: 6 }]}>
              <Ionicons name="log-in-outline" size={20} color={colors.blue} />
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.blue }}>Log in</Text>
            </Pressable>
          )}
        </View>

        {/* Hero card in the flag ribbon (see FlagFrame). */}
        {session && <PlanBanner />}
        <FlagFrame compact>
          <Text style={{ color: colors.blue, fontWeight: '800', letterSpacing: 2, fontSize: 12 }}>SERVLY AG / MARKETPLACE</Text>
          <Text style={[ui.h1, { fontSize: 26, lineHeight: 31 }]}>Find someone good for the job.</Text>
          <Text style={[ui.muted, { fontSize: 15, lineHeight: 21 }]}>Search local services by name or tag, pick a city or village, and send the merchant a note.</Text>
          <Pressable style={[ui.btn, ui.outline, { alignSelf: 'flex-start', flexDirection: 'row', gap: 8, height: 42, marginTop: 4 }]} onPress={() => (session ? router.push('/offer') : router.push({ pathname: '/login', params: { mode: 'up' } }))}>
            <Ionicons name="storefront-outline" size={20} color={colors.blue} />
            <Text style={[ui.btnText, { color: colors.ink }]}>Offer a service</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.ink} />
          </Pressable>
        </FlagFrame>

        <Text style={[ui.h2, { marginTop: 8 }]}>Services near you</Text>
        <View style={ui.card}>
          {/* The whole box is the text field (so any tap starts typing); the icon sits on top and ignores taps. */}
          <View>
            <TextInput style={[ui.field, { paddingLeft: 44 }]} placeholder="Try ‘home cleaning’ or ‘barber’" placeholderTextColor={colors.muted}
              value={f.q} onChangeText={set('q')} onSubmitEditing={search} returnKeyType="search" autoCorrect={false} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center' }}>
              <Ionicons name="search" size={20} color={colors.muted} />
            </View>
          </View>
          <View style={ui.row}>
            <TextInput style={[ui.field, { flex: 1 }]} placeholder="City" value={f.city} onChangeText={set('city')} onSubmitEditing={search} />
            <TextInput style={[ui.field, { flex: 1 }]} placeholder="Village" value={f.village} onChangeText={set('village')} onSubmitEditing={search} />
          </View>
          {!!err && <View style={ui.row}><Text style={[ui.error, { flex: 1 }]}>{err}</Text>{err.startsWith('Something') && <Pressable onPress={search}><Text style={{ color: colors.blue, fontWeight: '700' }}>Try again</Text></Pressable>}</View>}
          <View style={ui.row}>
            <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={clear} disabled={busy}><Text style={[ui.btnText, { color: colors.ink }]}>Clear filter</Text></Pressable>
            <Pressable style={[ui.btn, ui.primary, { flex: 1 }]} onPress={search} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Search</Text>}
            </Pressable>
          </View>
        </View>

        <View onLayout={(e) => { resultsY.current = e.nativeEvent.layout.y; }} style={{ gap: 12 }}>
          {rows && <Text style={ui.muted}>{rows.length} {rows.length === 1 ? 'service' : 'services'} found</Text>}
          {rows?.length === 0 && (
            <View style={[ui.card, { borderColor: colors.red, borderWidth: 2 }]}>
              <Text style={ui.muted}>No services found. Try different words or clear the filters.</Text>
            </View>
          )}
          {/* Swipeable rows by tier (Business, then Growth, then Starter), newest first in each row. */}
          {rows && ROWS.map((r) => {
            const list = rows.filter((s) => r.match(s.priority));
            return list.length > 0 && <ListingRow key={r.title} title={r.title} rows={list} ratings={ratings} />;
          })}
          {hasMore && (
            <Pressable style={[ui.btn, ui.outline]} onPress={() => run(query, false, true)} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.blue} /> : <Text style={[ui.btnText, { color: colors.ink }]}>Show more services</Text>}
            </Pressable>
          )}
        </View>
        <View style={{ marginTop: 16 }}><LegalLinks /></View>
      </ScrollView>
    </SafeAreaView>
  );
}
