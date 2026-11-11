import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance, type ViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cover } from '../components/Cover';
import { WideSplit } from '../components/WideSplit';
import { TopBar } from '../components/Menu';
import { LegalLinks } from '../components/LegalLinks';
import { PhoneToggle } from '../components/PhoneToggle';
import { AutoPay } from '../components/AutoPay';
import { PlanBanner } from '../components/PlanBanner';
import { forgetThisDevice } from '../lib/push';
import { setMode, useMode } from '../lib/mode';
import { formatPrice } from '../lib/price';
import { downloadReceipt, money, receiptNumber, type Payment } from '../lib/receipt';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { myTrialEnd, planStatus } from '../lib/trial';
import { colors, ui, WIDE } from '../lib/theme';
import { PinLoader } from '../components/PinLoader';
import { FirstTimeGuide, MERCHANT_SEEN, useGuideSeen, useMerchantGuideReplay, type GuideStep } from '../components/FirstTimeGuide';
import { useLogoTipOpen } from '../components/LogoTip';

type Me = { display_name: string; screen_name: string; bio: string; show_phone: boolean; plan_expires_at: string | null; tiers: { name: string; max_services: number | null } | null };
const label = { fontSize: 14, fontWeight: '700' as const, color: colors.ink, marginBottom: -4 };

type Svc = { id: string; title: string; photos: string[]; photo_focus: unknown; price: number | null; price_from: boolean; city: string; village: string | null; active: boolean; paused: boolean };

export default function Account() {
  const session = useSession();
  const uid = session?.user.id;
  const merchant = useMode() === 'merchant';
  const [me, setMe] = useState<Me | null>(null);
  const [b, setB] = useState({ screen: '', name: '', bio: '', phone: '' });
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
  const [moving, setMoving] = useState<{ next_tier_name: string | null; next_tier_at: string | null } | null>(null); // a waiting move to a smaller plan
  const [trialEnd, setTrialEnd] = useState<string | null>(null); // a running Founding Merchant free trial
  const [askRestore, setAskRestore] = useState<string | null>(null); // paused listing waiting for "Yes, bring it back"
  const [restoreErr, setRestoreErr] = useState('');
  const [tick, setTick] = useState(0); // reloads the page after bringing a listing back
  // Merchant welcome tour: once per device, the first time Account opens in Merchant view (publishing a first
  // listing lands here). Phones only. It waits for the page to load and for the logo tip to close.
  const tourRoot = useRef<ViewInstance>(null);
  const sc = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  const planRef = useRef<ViewInstance>(null);
  const receiptsRef = useRef<ViewInstance>(null);
  const listingRef = useRef<ViewInstance>(null);
  const menuRef = useRef<ViewInstance>(null);
  const tourSeen = useGuideSeen(MERCHANT_SEEN);
  const logoTipOpen = useLogoTipOpen();
  const [tourOpen, setTourOpen] = useState(false);
  const setBiz = (k: keyof typeof b) => (v: string) => { setB((p) => ({ ...p, [k]: v })); setMsg(''); };

  useFocusEffect(useCallback(() => {
    if (!uid) return;
    // The real phone number is private: only my_phone() returns it, and only to its owner.
    Promise.all([
      supabase.from('profiles').select('display_name,screen_name,bio,show_phone,plan_expires_at,tiers!tier_id(name,max_services)').eq('id', uid).single(),
      supabase.rpc('my_phone'),
    ]).then(([{ data, error }, ph]) => {
      if (!data) return setLoadErr(error?.message ?? 'Could not load your account.');
      setLoadErr('');
      const p = data as unknown as Me;
      setMe(p);
      setShowPhone(p.show_phone);
      setB({ screen: p.screen_name, name: p.display_name, bio: p.bio, phone: (ph.data as string | null) ?? '' });
    });
    myTrialEnd(uid).then(setTrialEnd);
    supabase.rpc('my_plan_change').maybeSingle().then(({ data }) => {
      const c = data as { next_tier_name: string | null; next_tier_at: string | null } | null;
      setMoving(c?.next_tier_at ? c : null);
    });
    supabase.from('services').select('id,title,photos,photo_focus,price,price_from,city,village,active,paused').eq('merchant_id', uid)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows((data as Svc[]) ?? []));
    // Every plan payment (logged by activate_plan) has a receipt.
    supabase.from('payments').select('*,tiers(name)').eq('merchant_id', uid).order('paid_at', { ascending: false })
      .then(({ data, error }) => { setPayErr(error?.message ?? ''); setPays((data as Payment[]) ?? []); });
  }, [uid, tick]));

  // Bring back one paused listing (only while the plan has a free slot; the database checks again).
  async function restore(id: string) {
    setRestoreErr('');
    const { error } = await supabase.rpc('restore_listing', { p_service: id });
    setAskRestore(null);
    if (error) return setRestoreErr(error.message);
    setTick((n) => n + 1);
  }

  async function getReceipt(p: Payment) {
    setPayErr('');
    try { await downloadReceipt(p, b.name, session?.user.email ?? ''); } catch (e) { setPayErr((e as Error).message); }
  }

  async function save() {
    const hasListings = !!rows?.length;
    if (!b.screen.trim()) return setMsg('Please add your name.');
    if (hasListings && !b.name.trim()) return setMsg('Please add your business name.');
    setBusy(true); setMsg('');
    // The business name only changes for people with a listing (it's set on Offer a service).
    const { error } = await supabase.from('profiles')
      .update({ screen_name: b.screen.trim(), ...(hasListings ? { display_name: b.name.trim() } : {}), bio: b.bio.trim(), phone: b.phone.trim() || null, show_phone: showPhone }).eq('id', uid!);
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
  // Paused listings (v20) come back only into a free slot of the current plan, and not while a move down is waiting.
  const limit = me?.tiers?.max_services ?? null;
  const liveCount = rows?.filter((s) => s.active && !s.paused).length ?? 0;
  const pausedCount = rows?.filter((s) => s.paused).length ?? 0;
  const canRestore = active && !moving && (limit === null || liveCount < limit);

  const tourReady = !WIDE && merchant && !!me && !!rows?.length && !!pays && !logoTipOpen;
  useEffect(() => {
    if (!tourReady || tourSeen !== false) return;
    const t = setTimeout(() => setTourOpen(true), 1200); // let the page settle (and the logo tip go first)
    return () => clearTimeout(t);
  }, [tourReady, tourSeen]);
  useMerchantGuideReplay(useCallback(() => { if (!WIDE) setTourOpen(true); }, []));
  const tourSteps: GuideStep[] = [
    { target: planRef, title: 'Welcome to Servly', text: 'Your business is on Servly. This is your plan and when it renews. Customers can see your listings while your plan is active.' },
    { target: receiptsRef, title: 'Your receipts', text: 'Every payment gets a receipt here. Tap Download to save it as a PDF.' },
    { target: listingRef, title: 'Your listings', text: 'Tap View to see your listing the way customers do. Tap Edit to change details, prices, opening hours and photos.' },
    { target: menuRef, title: 'Messages and help', text: 'Tap ☰ for Messages, where notes from customers arrive. Contact support is there too, and so is this tour (How to use Servly).' },
  ];

  return (
    <SafeAreaView style={ui.screen}>
      <View ref={tourRoot} collapsable={false} style={{ flex: 1 }}>
      <ScrollView ref={sc} contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled"
        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={32}>
        <TopBar menuRef={menuRef} />
        <WideSplit>
        <Text style={ui.h1}>Account</Text>
        <Text style={ui.muted}>{session?.user.email}</Text>
        <PlanBanner />
        {!me ? (loadErr ? <Text style={ui.error}>{loadErr}</Text> : <PinLoader />) : (
          <>
            <View style={ui.card}>
              <Text style={ui.h2}>Your details</Text>
              <Text style={label}>Name</Text>
              <TextInput placeholderTextColor={colors.muted} style={ui.field} placeholder="Name" maxLength={40} value={b.screen} onChangeText={setBiz('screen')} />
              <Text style={[ui.muted, { fontSize: 13, lineHeight: 18 }]}>Shown on your reviews and messages when you use Servly as a customer.</Text>
              {rows && rows.length > 0 && (
                <>
                  <Text style={label}>Business name</Text>
                  <TextInput placeholderTextColor={colors.muted} style={ui.field} placeholder="Business name" value={b.name} onChangeText={setBiz('name')} />
                  <Text style={[ui.muted, { fontSize: 13, lineHeight: 18 }]}>Shown on your listings, and on messages and reviews you send in Merchant view.</Text>
                </>
              )}
              <TextInput placeholderTextColor={colors.muted} style={[ui.field, { height: 96, paddingTop: 14, textAlignVertical: 'top' }]} placeholder="About you or your business" multiline value={b.bio} onChangeText={setBiz('bio')} />
              <TextInput placeholderTextColor={colors.muted} style={ui.field} placeholder="Phone or WhatsApp number" keyboardType="phone-pad" value={b.phone} onChangeText={setBiz('phone')} />
              {rows && rows.length > 0 && <PhoneToggle value={showPhone} onChange={(v) => { setShowPhone(v); setMsg(''); }} />}
              {!!msg && <Text style={msg === 'Saved.' ? { color: colors.blue, fontWeight: '700' } : ui.error}>{msg}</Text>}
              <Pressable style={[ui.btn, ui.primary]} onPress={save} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Save</Text>}
              </Pressable>
            </View>

            {merchant ? (
              <>
                <View ref={planRef} collapsable={false} style={ui.card}>
                  <Text style={ui.h2}>Your plan</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: active ? colors.blue : colors.red }}>
                    {active ? planStatus(me.tiers?.name, me.plan_expires_at!, trialEnd) : 'No active plan. Customers cannot see your listings yet.'}
                  </Text>
                  <AutoPay active={active} />
                  <Pressable style={[ui.btn, ui.outline]} onPress={() => router.push('/plan')}><Text style={[ui.btnText, { color: colors.ink }]}>See plans</Text></Pressable>
                </View>

                <View ref={receiptsRef} collapsable={false} style={ui.card}>
                  <Text style={ui.h2}>Receipts</Text>
                  {!pays && <PinLoader size={30} />}
                  {pays?.length === 0 && <Text style={ui.muted}>No payments yet. A receipt appears here each time your plan is paid.</Text>}
                  {pays?.map((p) => (
                    <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, borderTopWidth: 1, borderColor: colors.border }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>{new Date(p.paid_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                        <Text style={{ color: colors.muted, fontSize: 14 }}>{p.tiers?.name ?? p.tier_id}{p.booking_addon ? ' + bookings' : ''}{p.promo_code ? ` · ${p.promo_code}` : ''} · {money(p)}</Text>
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
                {!rows && <PinLoader size={30} />}
                {rows?.length === 0 && <Text style={ui.muted}>You have no listings yet.</Text>}
                {!!moving && (
                  <View style={[ui.card, { borderColor: colors.gold, borderWidth: 2 }]}>
                    <Text style={ui.muted}>
                      Your plan moves to {moving.next_tier_name} on {new Date(moving.next_tier_at!).toLocaleDateString()}. The listings you didn't keep will be paused then.
                    </Text>
                  </View>
                )}
                {pausedCount > 0 && (
                  <View style={[ui.card, { backgroundColor: '#FDF3D0', borderColor: colors.gold }]}>
                    <Text style={{ fontSize: 16, color: colors.ink, lineHeight: 22 }}>
                      {pausedCount === 1 ? '1 listing is' : `${pausedCount} listings are`} paused because of your plan: hidden from customers, but saved.{' '}
                      {canRestore ? `You have ${limit === null ? 'room' : `${limit - liveCount} free slot${limit - liveCount === 1 ? '' : 's'}`}: tap Bring back on the one you want live.` : 'Upgrade your plan to bring them back.'}
                    </Text>
                    {!canRestore && active && !moving && (
                      <Pressable style={[ui.btn, ui.outline]} onPress={() => router.push('/plan')}><Text style={[ui.btnText, { color: colors.ink }]}>See plans</Text></Pressable>
                    )}
                  </View>
                )}
                {!!restoreErr && <Text style={ui.error}>{restoreErr}</Text>}
                {rows?.map((s, n) => (
                  <View key={s.id} ref={n === 0 ? listingRef : undefined} collapsable={false} style={ui.card}>
                    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                      <Cover photos={s.photos} focus={s.photo_focus} title={s.title} width={72} height={72} radius={12} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{s.title}</Text>
                        <Text style={ui.muted}>{s.village ? `${s.village}, ` : ''}{s.city} · {formatPrice(s.price, s.price_from)}</Text>
                        <Text style={{ fontWeight: '700', color: s.active && !s.paused && active ? colors.blue : colors.muted }}>
                          {s.paused ? 'Paused (plan limit)' : s.active && active ? 'Visible to customers' : 'Hidden from customers'}
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
                    {/* Bring back: asks once, because the choice is locked until the next plan change. */}
                    {s.paused && canRestore && (askRestore === s.id ? (
                      <View style={{ gap: 8 }}>
                        <Text style={ui.muted}>Bring back "{s.title}"? It uses {limit === null ? 'a' : 'your free'} slot, and you can't swap it for another paused listing later.</Text>
                        <View style={ui.row}>
                          <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={() => setAskRestore(null)}><Text style={ui.btnText}>Cancel</Text></Pressable>
                          <Pressable style={[ui.btn, ui.primary, { flex: 1.4 }]} onPress={() => restore(s.id)}><Text style={[ui.btnText, { color: '#fff' }]}>Yes, bring it back</Text></Pressable>
                        </View>
                      </View>
                    ) : (
                      <Pressable style={[ui.btn, { backgroundColor: colors.gold }]} onPress={() => setAskRestore(s.id)}>
                        <Text style={[ui.btnText, { color: colors.ink }]}>Bring back</Text>
                      </Pressable>
                    ))}
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
                  <TextInput placeholderTextColor={colors.muted} style={ui.field} value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" placeholder="DELETE" />
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
            {/* Refund policy: merchants only in the apps (it's about plan payments); always on the website. */}
            <LegalLinks refund={Platform.OS === 'web' || merchant} />
          </>
        )}
        </WideSplit>
      </ScrollView>
      {tourOpen && (
        <FirstTimeGuide steps={tourSteps} root={tourRoot} storageKey={MERCHANT_SEEN}
          scrollBy={(dy) => sc.current?.scrollTo({ y: Math.max(0, scrollY.current + dy), animated: true })}
          onClose={() => { setTourOpen(false); sc.current?.scrollTo({ y: 0, animated: true }); }} />
      )}
      </View>
    </SafeAreaView>
  );
}
