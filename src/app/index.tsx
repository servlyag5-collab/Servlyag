import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListingRow, type CardListing } from '../components/ListingRow';
import { LegalLinks } from '../components/LegalLinks';
import { MenuButton } from '../components/Menu';
import { PlanBanner } from '../components/PlanBanner';
import { fetchListingRatings, type Rating } from '../lib/reviews';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { useMode } from '../lib/mode';
import { customerName } from '../lib/names';
import { colors, flag, fonts, ui } from '../lib/theme';

type Row = CardListing & { priority: number };
const EMPTY = { q: '', city: '', village: '' };
const PAGE = 30; // results loaded at a time
// City / Village boxes inside the dark hero: see-through white with white text.
const heroField = { backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.22)', color: '#fff', borderRadius: 14, minWidth: 0 };
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
  const merchantView = useMode() === 'merchant';
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
    supabase.from('profiles').select('display_name,screen_name').eq('id', session.user.id).single()
      .then(({ data: p }) => setName(customerName(p, merchantView, session.user.email || '')));
  }, [uid, merchantView]);

  // Search in the database (search_services): name, description and hidden tags, tolerant of small
  // spelling mistakes; Business first, then Growth, then Starter. Loads PAGE results at a time.
  async function run(x: typeof EMPTY, scroll: boolean, more = false) {
    setErr('');
    setBusy(true);
    const from = more ? (rows?.length ?? 0) : 0;
    const { data, error } = await supabase
      .rpc('search_services', { p_q: x.q.replace(/[%_\\]/g, ' ').trim(), p_city: x.city.trim(), p_village: x.village.trim() })
      .select('id,merchant_id,title,photos,price,price_from,show_hours,hours,priority,city,village,profiles(display_name)')
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
  const filtered = !!(query.q || query.city || query.village); // the results shown are a search, not everything
  const narrow = useWindowDimensions().width < 430; // phones: smaller headline and sun, so they never overlap

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView ref={sc} contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        {/* Top bar: the logo (full pin + the name cropped below its flag underline) and Log in / ☰. */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: LOGO_W * 0.05 }}>
            <View style={{ width: LOGO_W * 0.215, height: LOGO_W * LOGO_RATIO, overflow: 'hidden' }}>
              <Image source={require('../../assets/logo.png')} style={{ width: LOGO_W, height: LOGO_W * LOGO_RATIO }} />
            </View>
            <View style={{ width: LOGO_W * 0.725, height: LOGO_W * LOGO_RATIO * 0.63, overflow: 'hidden' }}>
              <Image source={require('../../assets/logo.png')} style={{ width: LOGO_W, height: LOGO_W * LOGO_RATIO, marginLeft: -LOGO_W * 0.275 }} />
            </View>
          </View>
          {session ? <MenuButton /> : (
            <Pressable onPress={() => router.push('/login')} style={[ui.row, { alignItems: 'center', gap: 6 }]}>
              <Ionicons name="log-in-outline" size={20} color={colors.blue} />
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.blue }}>Log in</Text>
            </Pressable>
          )}
        </View>

        {session && <PlanBanner />}

        {/* Hero: harbour blue with the flag's gold sun rising in the corner, the tagline as the headline,
            and the search right inside it (searching is what most people come for). Flag ribbon along the bottom. */}
        <View style={{ backgroundColor: colors.harbour, borderRadius: 28, overflow: 'hidden', marginTop: 4, boxShadow: '0px 14px 32px rgba(11, 58, 99, 0.28)' }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: narrow ? -70 : -70, top: narrow ? -80 : -70, width: narrow ? 190 : 230, height: narrow ? 190 : 230, borderRadius: 115, backgroundColor: 'rgba(252, 209, 22, 0.16)' }} />
          <View pointerEvents="none" style={{ position: 'absolute', right: narrow ? -46 : -34, top: narrow ? -52 : -34, width: narrow ? 120 : 150, height: narrow ? 120 : 150, borderRadius: 75, backgroundColor: colors.gold }} />
          <View style={{ padding: 22, paddingTop: 26, gap: 14 }}>
            {!!session && !!name && <Text style={{ color: '#BFD8EE', fontSize: 15, fontWeight: '600', maxWidth: '68%' }} numberOfLines={1}>Welcome back, {name}</Text>}
            <Text style={{ fontFamily: fonts.heading, fontSize: narrow ? 30 : 36, lineHeight: narrow ? 33 : 39, color: '#fff', letterSpacing: -0.8, maxWidth: narrow ? '80%' : '82%', marginTop: narrow ? 18 : 0 }}>
              Whatever you need, someone's ready.
            </Text>
            <Text style={{ color: '#CFE3F5', fontSize: 16, lineHeight: 22, maxWidth: 420 }}>
              Find trusted local services across Antigua and Barbuda, and message or call them directly.
            </Text>
            {/* The whole box is the text field (so any tap starts typing); the icon sits on top and ignores taps. */}
            <View style={{ marginTop: 6 }}>
              <TextInput style={[ui.field, { paddingLeft: 46, height: 56, borderRadius: 16, borderWidth: 0, backgroundColor: '#fff', fontSize: 17, width: '100%', minWidth: 0 }]}
                placeholder="What do you need? e.g. photographer" placeholderTextColor={colors.muted}
                value={f.q} onChangeText={set('q')} onSubmitEditing={search} returnKeyType="search" autoCorrect={false} />
              <View pointerEvents="none" style={{ position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' }}>
                <Ionicons name="search" size={21} color={colors.blue} />
              </View>
            </View>
            <View style={ui.row}>
              <TextInput style={[ui.field, heroField, { flex: 1 }]} placeholder="City" placeholderTextColor="#9FBCD6" value={f.city} onChangeText={set('city')} onSubmitEditing={search} />
              <TextInput style={[ui.field, heroField, { flex: 1 }]} placeholder="Village" placeholderTextColor="#9FBCD6" value={f.village} onChangeText={set('village')} onSubmitEditing={search} />
            </View>
            {!!err && <View style={ui.row}><Text style={{ flex: 1, color: '#FFD3D8', fontSize: 14 }}>{err}</Text>{err.startsWith('Something') && <Pressable onPress={search}><Text style={{ color: colors.gold, fontWeight: '700' }}>Try again</Text></Pressable>}</View>}
            <Pressable style={[ui.btn, { backgroundColor: colors.gold, height: 54, borderRadius: 16 }]} onPress={search} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.ink} /> : <Text style={{ fontFamily: fonts.title, fontSize: 18, color: colors.ink }}>Search services</Text>}
            </Pressable>
            {filtered && (
              <Pressable onPress={clear} disabled={busy} style={{ alignSelf: 'center' }}>
                <Text style={{ color: '#CFE3F5', fontWeight: '700', textDecorationLine: 'underline' }}>Clear search and show everything</Text>
              </Pressable>
            )}
          </View>
          <View style={{ flexDirection: 'row', height: 6 }}>
            {flag.map((st, i) => <View key={i} style={{ flex: st.flex, backgroundColor: st.color }} />)}
          </View>
        </View>

        {/* For businesses: a quiet invitation under the hero. */}
        <Pressable onPress={() => (session ? router.push('/offer') : router.push({ pathname: '/login', params: { mode: 'up' } }))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18, backgroundColor: '#EAF3FB' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="storefront" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.title, fontSize: 16, color: colors.ink }}>Run a business?</Text>
            <Text style={{ color: colors.muted, fontSize: 14 }}>List your services on Servly</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.blue} />
        </Pressable>

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
