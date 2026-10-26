import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cover } from '../components/Cover';
import { TopBar } from '../components/Menu';
import { LegalLinks } from '../components/LegalLinks';
import { PhoneToggle } from '../components/PhoneToggle';
import { PlanBanner } from '../components/PlanBanner';
import { forgetThisDevice } from '../lib/push';
import { setMode, useMode } from '../lib/mode';
import { formatPrice } from '../lib/price';
import { downloadReceipt, money, receiptNumber, type Payment } from '../lib/receipt';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type Me = { display_name: string; bio: string; show_phone: boolean; plan_expires_at: string | null; tiers: { name: string } | null };
type Svc = { id: string; title: string; photos: string[]; price: number | null; price_from: boolean; city: string; village: string | null; active: boolean };

export default function Account() {
  const session = useSession();
  const uid = session?.user.id;
  const merchant = useMode() === 'merchant';
  const [me, setMe] = useState<Me | null>(null);
  const [b, setB] = useState({ name: '', bio: '', phone: '' });
  const [showPhone, setShowPhone] = useState(true);
  const [rows, setRows] = useState<Svc[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [pays, setPays] = useState<Payment[] | null>(null);
  const [payErr, setPayErr] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState('');
  const setBiz = (k: keyof typeof b) => (v: string) => { setB((p) => ({ ...p, [k]: v })); setMsg(''); };

  useFocusEffect(useCallback(() => {
    if (!uid) return;
    // The real phone number is private: only my_phone() returns it, and only to its owner.
    Promise.all([
      supabase.from('profiles').select('display_name,bio,show_phone,plan_expires_at,tiers!tier_id(name)').eq('id', uid).single(),
      supabase.rpc('my_phone'),
    ]).then(([{ data, error }, ph]) => {
      if (!data) return setLoadErr(error?.message ?? 'Could not load your account.');
      setLoadErr('');
      const p = data as unknown as Me;
      setMe(p);
      setShowPhone(p.show_phone);
      setB({ name: p.display_name, bio: p.bio, phone: (ph.data as string | null) ?? '' });
    });
    supabase.from('services').select('id,title,photos,price,price_from,city,village,active').eq('merchant_id', uid)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows((data as Svc[]) ?? []));
    // Every plan payment (logged by activate_plan) has a receipt.
    supabase.from('payments').select('*,tiers(name)').eq('merchant_id', uid).order('paid_at', { ascending: false })
      .then(({ data, error }) => { setPayErr(error?.message ?? ''); setPays((data as Payment[]) ?? []); });
  }, [uid]));

  async function getReceipt(p: Payment) {
    setPayErr('');
    try { await downloadReceipt(p, b.name, session?.user.email ?? ''); } catch (e) { setPayErr((e as Error).message); }
  }

  async function save() {
    if (!b.name.trim()) return setMsg('Please add your name or business name.');
    setBusy(true); setMsg('');
    const { error } = await supabase.from('profiles')
      .update({ display_name: b.name.trim(), bio: b.bio.trim(), phone: b.phone.trim() || null, show_phone: showPhone }).eq('id', uid!);
    setBusy(false);
    setMsg(error ? error.message : 'Saved.');
  }

  // Delete my account: remove my photos from storage, then the database deletes everything else.
  async function deleteAccount() {
    setDeleting(true); setDelErr('');
    const { data: svcs } = await supabase.from('services').select('photos').eq('merchant_id', uid!);
    const paths = ((svcs as { photos: string[] }[]) ?? []).flatMap((s) => s.photos ?? []);
    if (paths.length) await supabase.storage.from('service-photos').remove(paths);
    await forgetThisDevice();
    const { error } = await supabase.rpc('delete_my_account');
    if (error) { setDeleting(false); return setDelErr(error.message); }
    setMode('customer');
    await supabase.auth.signOut();
    router.replace('/');
  }

  const active = !!me?.plan_expires_at && new Date(me.plan_expires_at) > new Date();

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        <Text style={ui.h1}>Account</Text>
        <Text style={ui.muted}>{session?.user.email}</Text>
        <PlanBanner />
        {!me ? (loadErr ? <Text style={ui.error}>{loadErr}</Text> : <ActivityIndicator color={colors.blue} />) : (
          <>
            <View style={ui.card}>
              <Text style={ui.h2}>Your details</Text>
              <TextInput style={ui.field} placeholder="Your name or business name" value={b.name} onChangeText={setBiz('name')} />
              <TextInput style={[ui.field, { height: 96, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="About you or your business" multiline value={b.bio} onChangeText={setBiz('bio')} />
              <TextInput style={ui.field} placeholder="Phone or WhatsApp number" keyboardType="phone-pad" value={b.phone} onChangeText={setBiz('phone')} />
              {rows && rows.length > 0 && <PhoneToggle value={showPhone} onChange={(v) => { setShowPhone(v); setMsg(''); }} />}
              {!!msg && <Text style={msg === 'Saved.' ? { color: colors.blue, fontWeight: '700' } : ui.error}>{msg}</Text>}
              <Pressable style={[ui.btn, ui.primary]} onPress={save} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Save</Text>}
              </Pressable>
            </View>

            {merchant ? (
              <>
                <View style={ui.card}>
                  <Text style={ui.h2}>Your plan</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: active ? colors.blue : colors.red }}>
                    {active ? `${me.tiers?.name} · active until ${new Date(me.plan_expires_at!).toLocaleDateString()}` : 'No active plan. Customers cannot see your listings yet.'}
                  </Text>
                  <Pressable style={[ui.btn, ui.outline]} onPress={() => router.push('/plan')}><Text style={[ui.btnText, { color: colors.ink }]}>See plans</Text></Pressable>
                </View>

                <View style={ui.card}>
                  <Text style={ui.h2}>Receipts</Text>
                  {!pays && <ActivityIndicator color={colors.blue} />}
                  {pays?.length === 0 && <Text style={ui.muted}>No payments yet. A receipt appears here each time your plan is paid.</Text>}
                  {pays?.map((p) => (
                    <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, borderTopWidth: 1, borderColor: colors.border }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{new Date(p.paid_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                        <Text style={{ color: colors.muted, fontSize: 14 }}>{p.tiers?.name ?? p.tier_id}{p.booking_addon ? ' + booking app' : ''} · {money(p)}</Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>{receiptNumber(p)}</Text>
                      </View>
                      <Pressable style={[ui.btn, ui.outline, { height: 44, flexDirection: 'row', gap: 6 }]} onPress={() => getReceipt(p)}>
                        <Ionicons name="download-outline" size={18} color={colors.blue} />
                        <Text style={[ui.btnText, { color: colors.ink }]}>Download</Text>
                      </Pressable>
                    </View>
                  ))}
                  {!!payErr && <Text style={ui.error}>{payErr}</Text>}
                </View>

                <Text style={[ui.h2, { marginTop: 8 }]}>Your listings</Text>
                {!rows && <ActivityIndicator color={colors.blue} />}
                {rows?.length === 0 && <Text style={ui.muted}>You have no listings yet.</Text>}
                {rows?.map((s) => (
                  <View key={s.id} style={ui.card}>
                    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                      <Cover photos={s.photos} title={s.title} width={72} height={72} radius={12} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{s.title}</Text>
                        <Text style={ui.muted}>{s.village ? `${s.village}, ` : ''}{s.city} · {formatPrice(s.price, s.price_from)}</Text>
                        <Text style={{ fontWeight: '700', color: s.active && active ? colors.blue : colors.muted }}>
                          {s.active && active ? 'Visible to customers' : 'Hidden from customers'}
                        </Text>
                      </View>
                    </View>
                    <View style={ui.row}>
                      <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={() => router.push({ pathname: '/service/[id]', params: { id: s.id } })}>
                        <Text style={[ui.btnText, { color: colors.ink }]}>View</Text>
                      </Pressable>
                      <Pressable style={[ui.btn, ui.primary, { flex: 1 }]} onPress={() => router.push({ pathname: '/edit/[id]', params: { id: s.id } })}>
                        <Text style={[ui.btnText, { color: '#fff' }]}>Edit</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                <Pressable style={[ui.btn, ui.primary]} onPress={() => router.push('/offer')}><Text style={[ui.btnText, { color: '#fff' }]}>Offer a service</Text></Pressable>
              </>
            ) : rows && rows.length > 0 ? (
              <View style={ui.card}>
                <Text style={ui.h2}>Your business</Text>
                <Text style={ui.muted}>Switch to merchant view to manage your listings, see notes from customers and manage your plan.</Text>
                <Pressable style={[ui.btn, ui.outline]} onPress={() => setMode('merchant')}><Text style={[ui.btnText, { color: colors.ink }]}>Switch to merchant view</Text></Pressable>
              </View>
            ) : (
              <View style={ui.card}>
                <Text style={ui.h2}>Start selling</Text>
                <Text style={ui.muted}>Publish your first service to unlock merchant view, your customer inbox and plans.</Text>
                <Pressable style={[ui.btn, ui.primary]} onPress={() => router.push('/offer')}><Text style={[ui.btnText, { color: '#fff' }]}>Offer a service</Text></Pressable>
              </View>
            )}

            {/* Delete my account (required by Apple and Google): type DELETE to confirm. */}
            <View style={[ui.card, { borderColor: colors.red, marginTop: 16 }]}>
              <Text style={[ui.h2, { color: colors.red }]}>Delete my account</Text>
              <Text style={ui.muted}>
                This permanently deletes your account, profile, listings, photos, messages, bookings and reviews. It can't be undone.
                {rows && rows.length > 0 ? ' Your plan is not refunded.' : ''}
              </Text>
              {askDelete ? (
                <>
                  <Text style={{ fontWeight: '700', color: colors.ink }}>Type DELETE to confirm.</Text>
                  <TextInput style={ui.field} value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" placeholder="DELETE" />
                  {!!delErr && <Text style={ui.error}>{delErr}</Text>}
                  <View style={ui.row}>
                    <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={() => { setAskDelete(false); setConfirmText(''); }}>
                      <Text style={[ui.btnText, { color: colors.ink }]}>Keep my account</Text>
                    </Pressable>
                    <Pressable style={[ui.btn, { flex: 1, backgroundColor: colors.red, opacity: confirmText.trim() === 'DELETE' ? 1 : 0.4 }]}
                      disabled={confirmText.trim() !== 'DELETE' || deleting} onPress={deleteAccount}>
                      {deleting ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Delete forever</Text>}
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable style={[ui.btn, ui.outline]} onPress={() => setAskDelete(true)}>
                  <Text style={[ui.btnText, { color: colors.red }]}>Delete my account</Text>
                </Pressable>
              )}
            </View>
            <LegalLinks />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
