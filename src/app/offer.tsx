import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type Plan = { name: string; max_services: number | null; booking_included: boolean };

export default function Offer() {
  const [b, setB] = useState({ name: '', bio: '', phone: '' });
  const [f, setF] = useState({ title: '', description: '', tags: '', price: '', city: '', village: '' });
  const [plan, setPlan] = useState<Plan | null>(null);
  const [booking, setBooking] = useState(false);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [addonPrice, setAddonPrice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const setBiz = (k: keyof typeof b) => (v: string) => setB((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    supabase.from('addons').select('monthly_price').eq('id', 'booking').single().then(({ data }) => setAddonPrice(data?.monthly_price ?? null));
    supabase.auth.getUser().then(async ({ data }) => {
      const { data: p } = await supabase.from('profiles').select('display_name,bio,phone,tiers(name,max_services,booking_included)').eq('id', data.user!.id).single();
      if (!p) return;
      setB({ name: p.display_name, bio: p.bio, phone: p.phone ?? '' });
      setPlan(p.tiers as unknown as Plan);
    });
  }, []);

  async function pick() {
    const left = 5 - photos.length;
    if (left <= 0) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: left, quality: 0.7 });
    if (!r.canceled) setPhotos((p) => [...p, ...r.assets].slice(0, 5));
  }

  async function save() {
    if (!b.name.trim()) return setErr('Add your business name.');
    if (!b.phone.trim()) return setErr('Add a phone or WhatsApp number so customers can call you.');
    if (!f.title.trim() || !f.city.trim()) return setErr('Please add a service name and a city.');
    if (f.price.trim() && isNaN(Number(f.price))) return setErr('Price must be a number.');
    setBusy(true); setErr('');
    const { data: { user } } = await supabase.auth.getUser();
    const up = await supabase.from('profiles').update({ display_name: b.name.trim(), bio: b.bio.trim(), phone: b.phone.trim() }).eq('id', user!.id);
    if (up.error) { setBusy(false); return setErr(up.error.message); }
    const { data: svc, error } = await supabase.from('services').insert({
      merchant_id: user!.id,
      title: f.title.trim(),
      description: f.description.trim(),
      tags: f.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      price: f.price.trim() ? Number(f.price) : null,
      city: f.city.trim(),
      village: f.village.trim() || null,
      booking_requested: !plan?.booking_included && booking,
    }).select('id').single();
    if (error) { setBusy(false); return setErr(error.message); }
    if (photos.length) {
      const paths: string[] = [];
      for (const [i, a] of photos.entries()) {
        const type = a.mimeType ?? 'image/jpeg';
        const path = `${user!.id}/${svc.id}/${i}.${type.split('/')[1]}`;
        const buf = await (await fetch(a.uri)).arrayBuffer();
        const up = await supabase.storage.from('service-photos').upload(path, buf, { contentType: type });
        if (!up.error) paths.push(path);
      }
      if (paths.length) await supabase.from('services').update({ photos: paths }).eq('id', svc.id);
    }
    setBusy(false);
    router.replace('/');
  }

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>← Back</Text></Pressable>
        <Text style={ui.h1}>Offer a service</Text>
        {plan && <Text style={ui.muted}>Your plan: {plan.name} · {plan.max_services ?? 'unlimited'} service listing{plan.max_services === 1 ? '' : 's'}. Listings go live once your plan is active.</Text>}

        <Text style={ui.h2}>Your business</Text>
        <TextInput style={ui.field} placeholder="Business name" value={b.name} onChangeText={setBiz('name')} />
        <TextInput style={[ui.field, { height: 90, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="About your business (optional)" multiline value={b.bio} onChangeText={setBiz('bio')} />
        <TextInput style={ui.field} placeholder="Phone or WhatsApp number" keyboardType="phone-pad" value={b.phone} onChangeText={setBiz('phone')} />

        <Text style={[ui.h2, { marginTop: 8 }]}>The service</Text>
        <TextInput style={ui.field} placeholder="Service name (e.g. Wedding photography)" value={f.title} onChangeText={set('title')} />
        <TextInput style={[ui.field, { height: 110, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="Describe what you offer" multiline value={f.description} onChangeText={set('description')} />
        <TextInput style={ui.field} placeholder="Tags, separated by commas (photographer, events)" autoCapitalize="none" value={f.tags} onChangeText={set('tags')} />
        <TextInput style={ui.field} placeholder="Price in EC$ (optional)" keyboardType="decimal-pad" value={f.price} onChangeText={set('price')} />
        <TextInput style={ui.field} placeholder="City" value={f.city} onChangeText={set('city')} />
        <TextInput style={ui.field} placeholder="Village (optional)" value={f.village} onChangeText={set('village')} />

        <Text style={[ui.h2, { marginTop: 8 }]}>Photos (optional, up to 5)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {photos.map((a, i) => (
            <Pressable key={a.uri} onPress={() => setPhotos(photos.filter((_, j) => j !== i))}>
              <Image source={{ uri: a.uri }} style={{ width: 96, height: 96, borderRadius: 10 }} />
              <Ionicons name="close-circle" size={22} color={colors.red} style={{ position: 'absolute', top: 2, right: 2 }} />
            </Pressable>
          ))}
          {photos.length < 5 && (
            <Pressable onPress={pick} style={[ui.field, { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="add" size={32} color={colors.blue} />
            </Pressable>
          )}
        </View>

        {plan?.booking_included ? (
          <Text style={{ color: colors.blue, fontWeight: '700' }}>The booking app is included with your plan.</Text>
        ) : (
          <Pressable style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }} onPress={() => setBooking(!booking)}>
            <Ionicons name={booking ? 'checkbox' : 'square-outline'} size={26} color={colors.blue} />
            <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>{`Add the booking app to this listing (add-on, ${addonPrice ?? 25} XCD / month)`}</Text>
          </Pressable>
        )}

        {!!err && <Text style={ui.error}>{err}</Text>}
        <Pressable style={[ui.btn, ui.primary]} onPress={save} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Publish service</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
