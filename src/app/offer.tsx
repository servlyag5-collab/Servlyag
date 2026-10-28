import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoverTag } from '../components/Cover';
import { WideSplit } from '../components/WideSplit';
import { PlacePicker } from '../components/PlacePicker';
import { PARISHES, VILLAGES } from '../lib/places';
import { TagRules } from '../components/TagRules';
import { parseTags, tagsProblem } from '../lib/tags';
import { TopBar } from '../components/Menu';
import { PhoneToggle } from '../components/PhoneToggle';
import { PriceInput } from '../components/PriceInput';
import { HoursEditor } from '../components/HoursEditor';
import { DEFAULT_HOURS, hoursProblem, type Hours } from '../lib/hours';
import { setMode } from '../lib/mode';
import { shrinkPhoto } from '../lib/photos';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type Plan = { name: string; max_services: number | null; booking_included: boolean };
// plan = the paid tier (the database counts listings against it); chosen = the tier picked on the Plan screen.
type Gate = { active: boolean; plan: Plan | null; chosen: Plan | null; used: number };
const toPlanFirst = () => router.replace({ pathname: '/plan', params: { next: 'offer' } });

export default function Offer() {
  const [b, setB] = useState({ name: '', bio: '', phone: '' });
  const [showPhone, setShowPhone] = useState(true);
  const [f, setF] = useState({ title: '', description: '', tags: '', price: '', city: '', village: '' });
  const [priceFrom, setPriceFrom] = useState(false); // "From EC$..." starting price
  const [showHours, setShowHours] = useState(false); // opening hours switch (hours stay saved when off)
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);
  const [gate, setGate] = useState<Gate | null>(null);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [addonPrice, setAddonPrice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const setBiz = (k: keyof typeof b) => (v: string) => setB((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    supabase.from('addons').select('monthly_price').eq('id', 'booking').single().then(({ data }) => setAddonPrice(data?.monthly_price ?? null));
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user!.id;
      const [{ data: p }, c, ph] = await Promise.all([
        supabase.from('profiles')
          .select('display_name,bio,show_phone,plan_expires_at,requested_tier,plan:tiers!tier_id(name,max_services,booking_included),chosen:tiers!requested_tier(name,max_services,booking_included)')
          .eq('id', uid).single(),
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('merchant_id', uid).eq('active', true),
        supabase.rpc('my_phone'), // the real number is private; only its owner can read it
      ]);
      if (!p) return;
      const active = !!p.plan_expires_at && new Date(p.plan_expires_at) > new Date();
      // Plans come first: with no active plan and none chosen yet, pick one before creating a listing.
      if (!active && !p.requested_tier) return toPlanFirst();
      setB({ name: p.display_name, bio: p.bio, phone: (ph.data as string | null) ?? '' });
      setShowPhone(p.show_phone);
      setGate({ active, plan: p.plan as unknown as Plan, chosen: p.chosen as unknown as Plan | null, used: c.count ?? 0 });
    });
  }, []);

  const limit = gate?.plan?.max_services ?? null; // null = unlimited
  const full = !!gate && limit !== null && gate.used >= limit;

  async function pick() {
    const left = 5 - photos.length;
    if (left <= 0) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: left, quality: 0.7 });
    if (!r.canceled) setPhotos((p) => [...p, ...r.assets].slice(0, 5));
  }

  async function save() {
    if (!b.name.trim()) return setErr('Add your business name.');
    if (showPhone && !b.phone.trim()) return setErr('Add a phone or WhatsApp number so customers can call you, or turn off "Show my phone number".');
    if (!f.title.trim() || !f.city.trim()) return setErr('Please add a service name and a city or parish.');
    if (tagsProblem(f.tags)) return setErr(tagsProblem(f.tags)!);
    if (f.price.trim() && isNaN(Number(f.price))) return setErr('Price must be a number.');
    if (showHours && hoursProblem(hours)) return setErr(hoursProblem(hours)!);
    setBusy(true); setErr('');
    const { data: { user } } = await supabase.auth.getUser();
    const up = await supabase.from('profiles').update({ display_name: b.name.trim(), bio: b.bio.trim(), phone: b.phone.trim() || null, show_phone: showPhone }).eq('id', user!.id);
    if (up.error) { setBusy(false); return setErr(up.error.message); }
    const { data: svc, error } = await supabase.from('services').insert({
      merchant_id: user!.id,
      title: f.title.trim(),
      description: f.description.trim(),
      tags: parseTags(f.tags),
      price: f.price.trim() ? Number(f.price) : null,
      price_from: priceFrom,
      show_hours: showHours,
      hours,
      city: f.city.trim(),
      village: f.village.trim() || null,
    }).select('id').single();
    if (error) { setBusy(false); return setErr(error.message); }
    if (photos.length) {
      const paths: string[] = [];
      for (const [i, a] of photos.entries()) {
        const small = await shrinkPhoto(a); // resized + compressed before upload
        const path = `${user!.id}/${svc.id}/${i}.${small.ext}`;
        const up = await supabase.storage.from('service-photos').upload(path, small.buf, { contentType: small.contentType });
        if (!up.error) paths.push(path);
      }
      if (paths.length) await supabase.from('services').update({ photos: paths }).eq('id', svc.id);
    }
    setBusy(false);
    // Having a listing unlocks merchant view; show it in Account.
    setMode('merchant');
    router.replace('/account');
  }

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        <WideSplit>
        <Text style={ui.h1}>Offer a service</Text>
        {!gate ? <ActivityIndicator color={colors.blue} /> : (
          <>
        <View style={ui.card}>
          <Text style={ui.h2}>{gate.active ? `Your plan: ${gate.plan?.name}` : `Your chosen plan: ${(gate.chosen ?? gate.plan)?.name}`}</Text>
          <Text style={ui.muted}>{limit === null ? `${gate.used} listings published (unlimited).` : `${gate.used} of ${limit} listing${limit === 1 ? '' : 's'} used.`}</Text>
          {!gate.active && (
            <Text style={ui.muted}>
              Waiting for payment. Your listings go live once payment is confirmed
              {gate.chosen && gate.chosen.max_services !== limit ? `, and you can then publish up to ${gate.chosen.max_services ?? 'unlimited'} listings.` : '.'}
            </Text>
          )}
          <Pressable onPress={() => router.push({ pathname: '/plan', params: { next: 'offer' } })}>
            <Text style={{ color: colors.blue, fontWeight: '700' }}>Change plan</Text>
          </Pressable>
        </View>

        {full ? (
          <View style={ui.card}>
            <Text style={ui.h2}>You've used all your listings</Text>
            <Text style={ui.muted}>Upgrade your plan to publish more services. If you already chose a bigger plan, you can add more once payment is confirmed.</Text>
            <Pressable style={[ui.btn, ui.primary]} onPress={() => router.push({ pathname: '/plan', params: { next: 'offer' } })}>
              <Text style={[ui.btnText, { color: '#fff' }]}>Upgrade your plan</Text>
            </Pressable>
          </View>
        ) : (
          <>
        <Text style={ui.h2}>Your business</Text>
        <TextInput style={ui.field} placeholder="Business name" value={b.name} onChangeText={setBiz('name')} />
        <TextInput style={[ui.field, { height: 90, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="About your business (optional)" multiline value={b.bio} onChangeText={setBiz('bio')} />
        <TextInput style={ui.field} placeholder="Phone or WhatsApp number" keyboardType="phone-pad" value={b.phone} onChangeText={setBiz('phone')} />
        <PhoneToggle value={showPhone} onChange={setShowPhone} />

        <Text style={[ui.h2, { marginTop: 8 }]}>The service</Text>
        <TextInput style={ui.field} placeholder="Service name (e.g. Wedding photography)" value={f.title} onChangeText={set('title')} />
        <TextInput style={[ui.field, { height: 110, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="Describe what you offer" multiline value={f.description} onChangeText={set('description')} />
        <TextInput style={ui.field} placeholder="Search tags, separated by commas (photographer, events)" autoCapitalize="none" value={f.tags} onChangeText={set('tags')} />
        <TagRules count={parseTags(f.tags).length} />
        <PriceInput value={f.price} onChange={set('price')} from={priceFrom} onFromChange={setPriceFrom} />
        {/* Pick a parish and village from the lists (src/lib/places.ts), or type one that isn't listed. */}
        <PlacePicker label="City or parish" placeholder="City or parish" value={f.city} onChange={set('city')} options={PARISHES} />
        <PlacePicker label="Village" placeholder="Village (optional)" value={f.village} onChange={set('village')} options={VILLAGES} />
        <HoursEditor show={showHours} onShow={setShowHours} hours={hours} onChange={setHours} />

        <Text style={[ui.h2, { marginTop: 8 }]}>Photos (optional, up to 5)</Text>
        <Text style={ui.muted}>Your first photo is the cover: use your logo or your best photo. It shows in search results. The other 4 show your work on the listing page.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {photos.map((a, i) => (
            <Pressable key={a.uri} onPress={() => setPhotos(photos.filter((_, j) => j !== i))}>
              <Image source={{ uri: a.uri }} style={{ width: 96, height: 96, borderRadius: 10 }} />
              <Ionicons name="close-circle" size={22} color={colors.red} style={{ position: 'absolute', top: 2, right: 2 }} />
              {i === 0 && <CoverTag />}
            </Pressable>
          ))}
          {photos.length < 5 && (
            <Pressable onPress={pick} style={[ui.field, { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="add" size={32} color={colors.blue} />
            </Pressable>
          )}
        </View>

        <Text style={gate.plan?.booking_included ? { color: colors.blue, fontWeight: '700' } : ui.muted}>
          {gate.plan?.booking_included ? 'The booking app is included with your plan.' : `Want the booking app (${addonPrice ?? 25} XCD / month)? Tick it on your Plan screen.`}
        </Text>

        {!!err && <Text style={ui.error}>{err}</Text>}
        <Pressable style={[ui.btn, ui.primary]} onPress={save} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Publish service</Text>}
        </Pressable>
          </>
        )}
          </>
        )}
        </WideSplit>
      </ScrollView>
    </SafeAreaView>
  );
}
