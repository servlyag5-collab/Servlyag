import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListingRow, type CardListing } from '../components/ListingRow';
import { FlagFrame } from '../components/FlagFrame';
import { MenuButton } from '../components/Menu';
import { fetchRatings, type Rating } from '../lib/reviews';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type Row = CardListing & { priority: number };
const EMPTY = { q: '', city: '', village: '' };
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

  async function run(x: typeof EMPTY, scroll: boolean) {
    setErr('');
    setBusy(true);
    let q = supabase.from('services')
      .select('id,merchant_id,title,photos,price,price_from,priority,city,village,profiles(display_name)')
      .eq('active', true).order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(50);
    if (x.city.trim()) q = q.ilike('city', x.city.trim());
    if (x.village.trim()) q = q.ilike('village', x.village.trim());
    // Match the name or description, or any tag equal to the whole search or to one of its words.
    // Tags are never shown to customers; they only help listings come up here.
    const t = x.q.replace(/[,()%*{}"\\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (t) {
      const words = [...new Set([t, ...t.split(' ')].map((w) => w.toLowerCase()).filter((w) => w.length > 1))];
      q = q.or([`title.ilike.%${t}%`, `description.ilike.%${t}%`, ...words.map((w) => `tags.cs.{"${w}"}`)].join(','));
    }
    const { data, error } = await q;
    setBusy(false);
    if (error) return setErr('Something went wrong. Please try again.');
    const list = data as unknown as Row[];
    setRows(list);
    fetchRatings(list.map((r) => r.merchant_id)).then(setRatings);
    if (scroll) setTimeout(() => sc.current?.scrollTo({ y: resultsY.current, animated: true }), 60);
  }
  const search = () => run(f, true);
  const clear = () => { setF(EMPTY); run(EMPTY, false); };

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView ref={sc} contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/logo.png')} style={{ height: 52, width: 196 }} resizeMode="contain" />
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
        <FlagFrame>
          <Text style={{ color: colors.blue, fontWeight: '800', letterSpacing: 2, fontSize: 13 }}>SERVLY AG / MARKETPLACE</Text>
          <Text style={ui.h1}>Find someone good for the job.</Text>
          <Text style={ui.muted}>Search local services by name or tag, pick a city or village, and send the merchant a note.</Text>
          <Pressable style={[ui.btn, ui.outline, { alignSelf: 'flex-start', flexDirection: 'row', gap: 8 }]} onPress={() => (session ? router.push('/offer') : router.push({ pathname: '/login', params: { mode: 'up' } }))}>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
