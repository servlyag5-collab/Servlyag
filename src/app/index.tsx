import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type Row = { id: string; title: string; tags: string[]; price: number | null; city: string; village: string | null; profiles: { display_name: string } | null };
const EMPTY = { q: '', city: '', village: '', min: '', max: '' };

export default function Home() {
  const [name, setName] = useState('');
  const [f, setF] = useState(EMPTY);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const sc = useRef<ScrollViewInstance>(null);
  const resultsY = useRef(0);
  const set = (k: keyof typeof EMPTY) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  useFocusEffect(useCallback(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const c = await supabase.from('notes').select('id, services!inner(merchant_id)', { count: 'exact', head: true })
        .eq('services.merchant_id', data.user.id).is('read_at', null);
      setUnread(c.count ?? 0);
    });
  }, []));

  useEffect(() => {
    run(EMPTY, false);
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from('profiles').select('display_name').eq('id', data.user.id).single();
      setName(p?.display_name || data.user.email || '');
    });
  }, []);

  async function run(x: typeof EMPTY, scroll: boolean) {
    setErr('');
    const min = x.min.trim() === '' ? null : Number(x.min);
    const max = x.max.trim() === '' ? null : Number(x.max);
    if ((min !== null && isNaN(min)) || (max !== null && isNaN(max))) return setErr('Min and Max must be numbers');
    if (min !== null && max !== null && min > max) return setErr("Min can't be higher than Max");
    setBusy(true);
    let q = supabase.from('services')
      .select('id,title,tags,price,city,village,profiles(display_name)')
      .eq('active', true).order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(50);
    if (x.city.trim()) q = q.ilike('city', x.city.trim());
    if (x.village.trim()) q = q.ilike('village', x.village.trim());
    if (min !== null) q = q.gte('price', min);
    if (max !== null) q = q.lte('price', max);
    const t = x.q.replace(/[,()%*]/g, ' ').trim();
    if (t) q = q.or(`title.ilike.%${t}%,description.ilike.%${t}%,tags.cs.{${t.toLowerCase()}}`);
    const { data, error } = await q;
    setBusy(false);
    if (error) return setErr('Something went wrong. Please try again.');
    setRows(data as unknown as Row[]);
    if (scroll) setTimeout(() => sc.current?.scrollTo({ y: resultsY.current, animated: true }), 60);
  }
  const search = () => run(f, true);
  const clear = () => { setF(EMPTY); run(EMPTY, false); };

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView ref={sc} contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/logo.png')} style={{ height: 52, width: 196 }} resizeMode="contain" />
        <View style={[ui.row, { alignItems: 'center' }]}>
          <Text style={{ flex: 1, color: colors.muted, fontSize: 16 }} numberOfLines={1}>{name}</Text>
          <Pressable onPress={() => router.push('/inbox')}><Text style={{ fontWeight: '700', fontSize: 16, color: colors.blue }}>Inbox{unread > 0 ? ` (${unread})` : ''}</Text></Pressable>
          <Pressable onPress={() => router.push('/plan')}><Text style={{ fontWeight: '700', fontSize: 16, color: colors.blue }}>Plan</Text></Pressable>
          <Pressable onPress={() => supabase.auth.signOut()} style={[ui.row, { alignItems: 'center', gap: 6 }]}>
            <Ionicons name="log-out-outline" size={20} color={colors.ink} />
            <Text style={{ fontWeight: '700', fontSize: 16, color: colors.ink }}>Log out</Text>
          </Pressable>
        </View>

        <View style={ui.card}>
          <Text style={{ color: colors.blue, fontWeight: '800', letterSpacing: 2, fontSize: 13 }}>SERVLY AG / MARKETPLACE</Text>
          <Text style={ui.h1}>Find someone good for the job.</Text>
          <Text style={ui.muted}>Search local services by name or tag, set a city and budget, and send the merchant a note.</Text>
          <Pressable style={[ui.btn, ui.outline, { alignSelf: 'flex-start', flexDirection: 'row', gap: 8 }]} onPress={() => router.push('/offer')}>
            <Ionicons name="storefront-outline" size={20} color={colors.blue} />
            <Text style={[ui.btnText, { color: colors.ink }]}>Offer a service</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <Text style={[ui.h2, { marginTop: 8 }]}>Services near you</Text>
        <View style={ui.card}>
          <View style={[ui.field, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <Ionicons name="search" size={20} color={colors.muted} />
            <TextInput style={{ flex: 1, fontSize: 16, color: colors.ink }} placeholder="Try ‘home cleaning’ or ‘barber’" value={f.q} onChangeText={set('q')} onSubmitEditing={search} returnKeyType="search" />
          </View>
          <View style={ui.row}>
            <TextInput style={[ui.field, { flex: 1 }]} placeholder="City" value={f.city} onChangeText={set('city')} onSubmitEditing={search} />
            <TextInput style={[ui.field, { flex: 1 }]} placeholder="Village" value={f.village} onChangeText={set('village')} onSubmitEditing={search} />
          </View>
          <View style={ui.row}>
            <TextInput style={[ui.field, { flex: 1 }]} placeholder="Min $" keyboardType="decimal-pad" value={f.min} onChangeText={set('min')} />
            <TextInput style={[ui.field, { flex: 1 }]} placeholder="Max $" keyboardType="decimal-pad" value={f.max} onChangeText={set('max')} />
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
            <View style={ui.card}>
              <Text style={ui.muted}>No services found. Try different words or clear the filters.</Text>
              <Pressable style={[ui.btn, ui.outline]} onPress={clear}><Text style={[ui.btnText, { color: colors.ink }]}>Clear filter</Text></Pressable>
            </View>
          )}
          {rows?.map((s) => (
            <Pressable key={s.id} style={ui.card} onPress={() => router.push({ pathname: '/service/[id]', params: { id: s.id } })}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{s.title}</Text>
              <Text style={ui.muted}>{s.profiles?.display_name || 'Servly merchant'} · {s.village ? `${s.village}, ` : ''}{s.city}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.blue }}>{s.price != null ? `EC$${s.price}` : 'Ask for price'}</Text>
              {s.tags.length > 0 && <Text style={{ color: colors.muted }}>{s.tags.map((t) => `#${t}`).join('  ')}</Text>}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
