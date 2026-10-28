import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoverTag, photoUrl } from '../../components/Cover';
import { TopBar } from '../../components/Menu';
import { PhoneToggle } from '../../components/PhoneToggle';
import { PriceInput } from '../../components/PriceInput';
import { HoursEditor } from '../../components/HoursEditor';
import { DEFAULT_HOURS, hoursProblem, normalizeHours, type Hours } from '../../lib/hours';
import { useMode } from '../../lib/mode';
import { shrinkPhoto } from '../../lib/photos';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, ui } from '../../lib/theme';

// One photo in the order shown: already saved (path) or newly picked (asset). The first is the cover.
type Photo = { path?: string; asset?: ImagePicker.ImagePickerAsset };
const keyOf = (p: Photo) => p.path ?? p.asset!.uri;

// Edit one of my listings: business details, service fields and photos (max 5).
export default function EditListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const uid = session?.user.id;
  const merchant = useMode() === 'merchant';
  const [b, setB] = useState({ name: '', bio: '', phone: '' });
  const [showPhone, setShowPhone] = useState(true);
  const [f, setF] = useState({ title: '', description: '', tags: '', price: '', city: '', village: '' });
  const [priceFrom, setPriceFrom] = useState(false); // "From EC$..." starting price
  const [showHours, setShowHours] = useState(false); // opening hours switch (hours stay saved when off)
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [removed, setRemoved] = useState<string[]>([]); // saved photos to delete on Save
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const setBiz = (k: keyof typeof b) => (v: string) => setB((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!uid) return;
    Promise.all([
      supabase.from('services').select('title,description,tags,price,price_from,show_hours,hours,city,village,photos').eq('id', id).eq('merchant_id', uid).single(),
      supabase.from('profiles').select('display_name,bio,show_phone').eq('id', uid).single(),
      supabase.rpc('my_phone'), // the real number is private; only its owner can read it
    ]).then(([s, p, ph]) => {
      if (!s.data) return setErr('This listing could not be found, or it is not yours.');
      setF({
        title: s.data.title, description: s.data.description, tags: (s.data.tags as string[]).join(', '),
        price: s.data.price != null ? String(s.data.price) : '', city: s.data.city, village: s.data.village ?? '',
      });
      setPriceFrom(!!s.data.price_from);
      setShowHours(!!s.data.show_hours);
      setHours(normalizeHours(s.data.hours));
      setPhotos(((s.data.photos ?? []) as string[]).map((path) => ({ path })));
      if (p.data) {
        setB({ name: p.data.display_name, bio: p.data.bio, phone: (ph.data as string | null) ?? '' });
        setShowPhone(p.data.show_phone);
      }
      setLoaded(true);
    });
  }, [id, uid]);

  const count = photos.length;

  async function pick() {
    const left = 5 - count;
    if (left <= 0) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: left, quality: 0.7 });
    if (!r.canceled) setPhotos((p) => [...p, ...r.assets.map((asset) => ({ asset }))].slice(0, 5));
  }
  function remove(p: Photo) {
    if (p.path) setRemoved((r) => [...r, p.path!]);
    setPhotos((all) => all.filter((x) => x !== p));
  }
  const makeCover = (p: Photo) => setPhotos((all) => [p, ...all.filter((x) => x !== p)]);

  async function save() {
    if (!b.name.trim()) return setErr('Add your business name.');
    if (showPhone && !b.phone.trim()) return setErr('Add a phone or WhatsApp number so customers can call you, or turn off "Show my phone number".');
    if (!f.title.trim() || !f.city.trim()) return setErr('Please add a service name and a city.');
    if (f.price.trim() && isNaN(Number(f.price))) return setErr('Price must be a number.');
    if (showHours && hoursProblem(hours)) return setErr(hoursProblem(hours)!);
    setBusy(true); setErr('');

    const up = await supabase.from('profiles').update({ display_name: b.name.trim(), bio: b.bio.trim(), phone: b.phone.trim() || null, show_phone: showPhone }).eq('id', uid!);
    if (up.error) { setBusy(false); return setErr(up.error.message); }

    // Keep the order shown (first = cover). New photos get a unique name so they never clash.
    const paths: string[] = [];
    for (const [i, p] of photos.entries()) {
      if (p.path) { paths.push(p.path); continue; }
      const a = p.asset!;
      const small = await shrinkPhoto(a); // resized + compressed before upload
      const path = `${uid}/${id}/${Date.now()}-${i}.${small.ext}`;
      const r = await supabase.storage.from('service-photos').upload(path, small.buf, { contentType: small.contentType });
      if (!r.error) paths.push(path);
    }

    const { error } = await supabase.from('services').update({
      title: f.title.trim(),
      description: f.description.trim(),
      tags: f.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      price: f.price.trim() ? Number(f.price) : null,
      price_from: priceFrom,
      show_hours: showHours,
      hours,
      city: f.city.trim(),
      village: f.village.trim() || null,
      photos: paths,
    }).eq('id', id);
    if (error) { setBusy(false); return setErr(error.message); }

    if (removed.length) await supabase.storage.from('service-photos').remove(removed);
    setBusy(false);
    router.back();
  }

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        <Text style={ui.h1}>Edit listing</Text>
        {!merchant ? <Text style={ui.muted}>Switch to merchant view (in the ☰ menu) to edit your listings.</Text>
          : !loaded ? (err ? <Text style={ui.error}>{err}</Text> : <ActivityIndicator color={colors.blue} />) : (
          <>
            <Text style={ui.h2}>Your business</Text>
            <Text style={ui.muted}>These details show on all your listings.</Text>
            <TextInput style={ui.field} placeholder="Business name" value={b.name} onChangeText={setBiz('name')} />
            <TextInput style={[ui.field, { height: 90, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="About your business (optional)" multiline value={b.bio} onChangeText={setBiz('bio')} />
            <TextInput style={ui.field} placeholder="Phone or WhatsApp number" keyboardType="phone-pad" value={b.phone} onChangeText={setBiz('phone')} />
            <PhoneToggle value={showPhone} onChange={setShowPhone} />

            <Text style={[ui.h2, { marginTop: 8 }]}>The service</Text>
            <TextInput style={ui.field} placeholder="Service name" value={f.title} onChangeText={set('title')} />
            <TextInput style={[ui.field, { height: 110, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="Describe what you offer" multiline value={f.description} onChangeText={set('description')} />
            <TextInput style={ui.field} placeholder="Search tags, separated by commas" autoCapitalize="none" value={f.tags} onChangeText={set('tags')} />
            <Text style={[ui.muted, { fontSize: 14, marginTop: -6 }]}>Tags help customers find you in search. They are not shown on your listing.</Text>
            <PriceInput value={f.price} onChange={set('price')} from={priceFrom} onFromChange={setPriceFrom} />
            <TextInput style={ui.field} placeholder="City" value={f.city} onChangeText={set('city')} />
            <TextInput style={ui.field} placeholder="Village (optional)" value={f.village} onChangeText={set('village')} />
            <HoursEditor show={showHours} onShow={setShowHours} hours={hours} onChange={setHours} />

            <Text style={[ui.h2, { marginTop: 8 }]}>Photos ({count} of 5)</Text>
            <Text style={ui.muted}>The cover (your logo or best photo) shows in search results. The other photos show your work on the listing page. Tap × to remove, or Make cover to move a photo to the front. Changes are saved when you tap Save.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {photos.map((p, i) => (
                <View key={keyOf(p)} style={{ width: 96, gap: 4 }}>
                  <View>
                    <Image source={{ uri: p.path ? photoUrl(p.path) : p.asset!.uri }} style={{ width: 96, height: 96, borderRadius: 10 }} />
                    <Pressable onPress={() => remove(p)} hitSlop={6} style={{ position: 'absolute', top: 2, right: 2 }} accessibilityLabel="Remove photo">
                      <Ionicons name="close-circle" size={22} color={colors.red} />
                    </Pressable>
                    {i === 0 && <CoverTag />}
                  </View>
                  {i > 0 && (
                    <Pressable onPress={() => makeCover(p)}>
                      <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 13, textAlign: 'center' }}>Make cover</Text>
                    </Pressable>
                  )}
                </View>
              ))}
              {count < 5 && (
                <Pressable onPress={pick} style={[ui.field, { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="add" size={32} color={colors.blue} />
                </Pressable>
              )}
            </View>

            {!!err && <Text style={ui.error}>{err}</Text>}
            <Pressable style={[ui.btn, ui.primary]} onPress={save} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Save changes</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
