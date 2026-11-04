import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/Menu';
import { bookingDay } from '../lib/bookings';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';
import { PinLoader } from '../components/PinLoader';

// The owner's dashboard (admins only; add yourself with the SQL at the top of upgrade-v14-launch-ready.sql).
// Merchants: activate/renew plans, start Founding Merchant free trials (v22), give free bookings for N days (v28); with v26 also change
// plan or extend it free of charge, and see each merchant's listings with Turn off / Turn on. Support: reply to requests. Reports: review and act.
// Promos: launch promo codes (v23) with places used, and on/off.
type Merchant = { id: string; display_name: string; email: string; tier_id: string; plan_expires_at: string | null;
  requested_tier: string | null; booking_requested: boolean; listings: number; has_booking: boolean;
  trial_ends_at: string | null; // when their free trial ends (null = never had one)
  promo: string | null;        // e.g. "LAUNCH50: next payment 50% off the plan (1 of 2)"
  booking_source: 'business' | 'paid' | 'trial' | 'free' | null; // why they have bookings (v28); null = no bookings
  free_booking_until: string | null;                             // when the owner's free bookings end (v28)
  calls_month: number; calls_total: number };                    // Call button taps (v29), owner-only for now
type AdminListing = { id: string; title: string; active: boolean; paused: boolean; calls_month: number; calls_total: number };
type PromoCode = { code: string; percent_off: number; months: number; max_uses: number; active: boolean; paid: number; holding: number };
type Ticket = { id: string; topic: string; subject: string; body: string; status: string; reply: string | null; created_at: string; profiles: { display_name: string } | null };
type Report = { id: string; target_type: 'listing' | 'review' | 'user'; target_id: string; reason: string; details: string; status: string;
  created_at: string; reporter: { display_name: string } | null };

const TIERS = [{ id: 'basic', name: 'Starter' }, { id: 'plus', name: 'Growth' }, { id: 'premium', name: 'Business' }];
const tierName = (id: string | null) => TIERS.find((t) => t.id === id)?.name ?? id ?? '—';
const chip = (on: boolean) => ({ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1,
  borderColor: on ? colors.blue : colors.border, backgroundColor: on ? colors.blue : '#fff' });
const chipText = (on: boolean) => ({ fontWeight: '700' as const, color: on ? '#fff' : colors.ink });

export default function Admin() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'merchants' | 'support' | 'reports' | 'promos'>('merchants');
  useFocusEffect(useCallback(() => { supabase.rpc('is_admin').then(({ data }) => setAllowed(!!data)); }, []));

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        <Text style={ui.h1}>Admin</Text>
        {allowed === null ? <PinLoader /> : !allowed ? (
          <Text style={ui.muted}>This page is for Servly admins only.</Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', backgroundColor: colors.field, borderRadius: 12, padding: 4, gap: 4 }}>
              {(['merchants', 'support', 'reports', 'promos'] as const).map((t) => (
                <Pressable key={t} onPress={() => setTab(t)}
                  style={{ flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t ? colors.blue : 'transparent' }}>
                  <Text style={{ fontWeight: '800', color: tab === t ? '#fff' : colors.muted }}>{t[0].toUpperCase() + t.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
            {tab === 'merchants' && <Merchants />}
            {tab === 'support' && <Support />}
            {tab === 'reports' && <Reports />}
            {tab === 'promos' && <Promos />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Merchants: find, activate/renew a plan, free trial, booking app on/off ------------------------------------
function Merchants() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Merchant[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback((query = q) => {
    supabase.rpc('admin_find_merchants', { p_query: query }).then(({ data, error }) => { setErr(error?.message ?? ''); setRows((data as Merchant[]) ?? []); });
  }, [q]);
  useFocusEffect(useCallback(() => { load(''); }, []));

  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.muted}>People who chose a plan but haven't been activated are listed first. After a merchant pays, activate their plan here: it adds one month and creates their receipt. Founding Merchants can get a free trial instead: no payment, no receipt, one per merchant.</Text>
      <View style={ui.row}>
        <TextInput style={[ui.field, { flex: 1 }]} placeholder="Search name or email" autoCapitalize="none" value={q} onChangeText={setQ} onSubmitEditing={() => load()} />
        <Pressable style={[ui.btn, ui.primary]} onPress={() => load()}><Ionicons name="search" size={20} color="#fff" /></Pressable>
      </View>
      {!rows && !err && <PinLoader />}
      {!!err && <Text style={ui.error}>{err}</Text>}
      {rows?.length === 0 && <Text style={ui.muted}>No matches.</Text>}
      {rows?.map((m) => <MerchantCard key={m.id} m={m} onChanged={() => load()} />)}
    </View>
  );
}

function MerchantCard({ m, onChanged }: { m: Merchant; onChanged: () => void }) {
  const [tier, setTier] = useState(m.requested_tier ?? m.tier_id);
  const [booking, setBooking] = useState(m.booking_requested);
  const [days, setDays] = useState('90');
  const [extendDays, setExtendDays] = useState('30');
  const [bookDays, setBookDays] = useState('30');
  const [listings, setListings] = useState<AdminListing[] | null>(null); // loaded when "Show listings" is tapped
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const active = !!m.plan_expires_at && new Date(m.plan_expires_at) > new Date();

  async function act(fn: () => PromiseLike<{ error: { message: string } | null }>, done: string) {
    setBusy(true); setMsg('');
    const { error } = await fn();
    setBusy(false);
    setMsg(error ? error.message : done);
    if (!error) { onChanged(); if (listings) loadListings(); }
  }

  function loadListings() {
    supabase.rpc('admin_merchant_listings', { p_user: m.id }).then(({ data, error }) => {
      if (error) return setMsg(error.message);
      setListings((data as AdminListing[]) ?? []);
    });
  }

  // Free of charge (v26): no payment, no receipt.
  async function changePlan() {
    setBusy(true); setMsg('');
    const { data, error } = await supabase.rpc('admin_change_plan', { p_user: m.id, p_tier: tier, p_booking: booking });
    setBusy(false);
    if (error) return setMsg(error.message);
    const paused = (data as number) ?? 0;
    setMsg(`Plan changed to ${tierName(tier)}${booking || tier === 'premium' ? ' with bookings' : ''}, no charge.${paused ? ` ${paused} listing${paused === 1 ? '' : 's'} paused (over the limit).` : ''}`);
    onChanged();
    if (listings) loadListings();
  }
  const bookN = Number(bookDays);
  const bookOk = Number.isInteger(bookN) && bookN >= 1 && bookN <= 365;
  const freeBooking = !!m.free_booking_until && new Date(m.free_booking_until) > new Date();
  const bookingLine = m.booking_source === 'business' ? 'Bookings: included with Business'
    : m.booking_source === 'paid' ? 'Bookings: paid upgrade'
    : m.booking_source === 'trial' ? 'Bookings: included in their free trial'
    : m.booking_source === 'free' ? `Bookings: free until ${bookingDay(m.free_booking_until!)}` : 'Bookings: off';
  const extendN = Number(extendDays);
  const extendOk = Number.isInteger(extendN) && extendN >= 1 && extendN <= 365;

  const trialDays = Number(days);
  const trialOk = Number.isInteger(trialDays) && trialDays >= 1 && trialDays <= 365;
  const onTrial = !!m.trial_ends_at && new Date(m.trial_ends_at) > new Date();

  return (
    <View style={[ui.card, { padding: 14, gap: 8 }]}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{m.display_name || 'No name'}</Text>
      <Text style={{ color: colors.muted }}>{m.email} · {m.listings} listing{m.listings === 1 ? '' : 's'}</Text>
      <Text style={{ fontWeight: '700', color: active ? colors.blue : colors.red }}>
        {active ? `${tierName(m.tier_id)} · active until ${bookingDay(m.plan_expires_at!)}` : 'No active plan'}
      </Text>
      <Text style={{ fontWeight: '700', color: m.booking_source ? colors.blue : colors.muted }}>{bookingLine}</Text>
      {/* Taps on Call (listing page + business profile). Only the owner sees these for now. */}
      <Text style={{ color: colors.ink }}>📞 {m.calls_month ?? 0} call tap{m.calls_month === 1 ? '' : 's'} this month · {m.calls_total ?? 0} overall</Text>
      {!!m.trial_ends_at && (
        <Text style={{ color: colors.muted }}>Free trial {onTrial ? 'until' : 'ended'} {bookingDay(m.trial_ends_at)}</Text>
      )}
      {!!m.promo && <Text style={{ fontWeight: '700', color: colors.blue }}>Promo {m.promo}</Text>}
      {!!m.requested_tier && (
        <Text style={{ fontWeight: '700', color: '#B07C00' }}>Chose {tierName(m.requested_tier)}{m.booking_requested ? ' + booking app' : ''}: waiting for activation</Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TIERS.map((t) => (
          <Pressable key={t.id} style={chip(tier === t.id)} onPress={() => setTier(t.id)}><Text style={chipText(tier === t.id)}>{t.name}</Text></Pressable>
        ))}
        <Pressable style={chip(booking)} onPress={() => setBooking(!booking)}><Text style={chipText(booking)}>+ booking app</Text></Pressable>
      </View>
      {!!msg && <Text style={/^(Plan|Booking|Free bookings|Free trial|Extended|Listing)/.test(msg) ? { color: colors.blue, fontWeight: '700' } : ui.error}>{msg}</Text>}
      <View style={ui.row}>
        <Pressable style={[ui.btn, ui.primary, { flex: 1, height: 44 }]} disabled={busy}
          onPress={() => act(() => supabase.rpc('admin_activate_plan', { p_user: m.id, p_tier: tier, p_booking: booking }), `Plan activated: ${tierName(tier)} for one month.`)}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>{active ? 'Renew 1 month (paid)' : 'Activate 1 month (paid)'}</Text>}
        </Pressable>
      </View>
      {/* No charge (v26): switch to the plan picked above straight away, or add days to their plan. */}
      <Pressable style={[ui.btn, ui.outline, { height: 44, borderColor: colors.blue }]} disabled={busy} onPress={changePlan}>
        <Text style={[ui.btnText, { color: colors.blue }]}>Change plan to {tierName(tier)} now (no charge)</Text>
      </Pressable>
      <View style={ui.row}>
        <TextInput style={[ui.field, { width: 70, height: 44, textAlign: 'center' }]} keyboardType="number-pad" maxLength={3}
          value={extendDays} onChangeText={(v) => setExtendDays(v.replace(/[^0-9]/g, ''))} accessibilityLabel="Days to add" />
        <Pressable style={[ui.btn, ui.outline, { flex: 1, height: 44, borderColor: colors.blue }]} disabled={busy || !extendOk}
          onPress={() => act(() => supabase.rpc('admin_extend_plan', { p_user: m.id, p_days: extendN }), `Extended by ${extendN} day${extendN === 1 ? '' : 's'}, no charge.`)}>
          <Text style={[ui.btnText, { color: extendOk ? colors.blue : colors.muted }]}>{extendOk ? `Extend plan ${extendN} day${extendN === 1 ? '' : 's'} (no charge)` : 'Extend: 1 to 365 days'}</Text>
        </Pressable>
      </View>
      {/* Free bookings (v28): the booking app for this many days, no charge; it switches off by itself.
          Business plans include bookings, so there is nothing to switch for them. */}
      {m.booking_source === 'business' ? (
        <Text style={ui.muted}>Bookings come with the Business plan, so they can't be switched on or off here.</Text>
      ) : (
        <View style={ui.row}>
          <TextInput style={[ui.field, { width: 70, height: 44, textAlign: 'center' }]} keyboardType="number-pad" maxLength={3}
            value={bookDays} onChangeText={(v) => setBookDays(v.replace(/[^0-9]/g, ''))} accessibilityLabel="Days of free bookings" />
          <Pressable style={[ui.btn, ui.outline, { flex: 1, height: 44, borderColor: colors.blue }]} disabled={busy || !bookOk}
            onPress={() => act(() => supabase.rpc('admin_free_booking', { p_user: m.id, p_days: bookN }), `Free bookings on for ${bookN} more day${bookN === 1 ? '' : 's'}, no charge.`)}>
            <Text style={[ui.btnText, { color: bookOk ? colors.blue : colors.muted }]}>{bookOk ? `Bookings on ${bookN} day${bookN === 1 ? '' : 's'} (no charge)` : 'Bookings: 1 to 365 days'}</Text>
          </Pressable>
          {freeBooking && (
            <Pressable style={[ui.btn, ui.outline, { height: 44 }]} disabled={busy}
              onPress={() => act(() => supabase.rpc('admin_stop_free_booking', { p_user: m.id }), 'Free bookings switched off.')}>
              <Text style={[ui.btnText, { color: colors.ink }]}>Off</Text>
            </Pressable>
          )}
        </View>
      )}
      {!m.trial_ends_at && !active && (
        // Founding Merchants: the chosen plan (and booking app, if ticked) free for this many days.
        <View style={ui.row}>
          <TextInput style={[ui.field, { width: 70, height: 44, textAlign: 'center' }]} keyboardType="number-pad" maxLength={3}
            value={days} onChangeText={(v) => setDays(v.replace(/[^0-9]/g, ''))} accessibilityLabel="Free trial days" />
          <Pressable style={[ui.btn, ui.outline, { flex: 1, height: 44, borderColor: colors.blue }]} disabled={busy || !trialOk}
            onPress={() => act(() => supabase.rpc('admin_start_free_trial', { p_user: m.id, p_tier: tier, p_days: trialDays, p_booking: booking }),
              `Free trial started: ${tierName(tier)} for ${trialDays} days.`)}>
            <Text style={[ui.btnText, { color: trialOk ? colors.blue : colors.muted }]}>{trialOk ? `Start ${trialDays}-day free trial` : 'Free trial: 1 to 365 days'}</Text>
          </Pressable>
        </View>
      )}

      {/* The merchant's listings: open one, or turn it off / on (turning on also un-pauses it). */}
      {m.listings > 0 && (listings === null ? (
        <Pressable onPress={loadListings} style={{ paddingVertical: 6 }}>
          <Text style={{ color: colors.blue, fontWeight: '700' }}>Show listings ({m.listings})</Text>
        </Pressable>
      ) : (
        <View style={{ gap: 6, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 }}>
          {listings.map((l) => {
            const live = l.active && !l.paused;
            const status = !l.active ? 'Off' : l.paused ? 'Paused (plan limit)' : active ? 'Live' : 'Hidden: plan ended';
            return (
              <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/service/[id]', params: { id: l.id } })}>
                  <Text style={{ fontWeight: '700', color: colors.ink }} numberOfLines={1}>{l.title}</Text>
                  <Text style={{ fontSize: 13, color: status === 'Live' ? colors.blue : colors.muted }}>{status} · 📞 {l.calls_month ?? 0} this month, {l.calls_total ?? 0} overall</Text>
                </Pressable>
                <Pressable style={[ui.btn, live ? ui.outline : ui.primary, { height: 38, paddingHorizontal: 14 }]} disabled={busy}
                  onPress={() => act(() => supabase.rpc('admin_set_listing_on', { p_service: l.id, p_on: !live }), `Listing "${l.title}" turned ${live ? 'off' : 'on'}.`)}>
                  <Text style={[ui.btnText, { color: live ? colors.ink : '#fff', fontSize: 14 }]}>Turn {live ? 'off' : 'on'}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ---- Promos: launch codes, places used, on/off --------------------------------------------------------
function Promos() {
  const [rows, setRows] = useState<PromoCode[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    supabase.rpc('admin_promo_codes').then(({ data, error }) => { setErr(error?.message ?? ''); setRows((data as PromoCode[]) ?? []); });
  }, []);
  useFocusEffect(load);
  async function toggle(c: PromoCode) {
    const { error } = await supabase.rpc('admin_set_promo_active', { p_code: c.code, p_active: !c.active });
    if (error) return setErr(error.message);
    load();
  }
  return (
    <>
      <Text style={ui.muted}>
        Merchants type a code at Checkout. It holds a place for 7 days; the discount is taken when you activate their plan.
        Places count once paid, or while held. Switch the backup code on when the first one runs out.
      </Text>
      {!rows && !err && <PinLoader />}
      {!!err && <Text style={ui.error}>{err}</Text>}
      {rows?.map((c) => {
        const left = c.max_uses - c.paid - c.holding;
        return (
          <View key={c.code} style={[ui.card, { padding: 14, gap: 6 }, c.active && { borderColor: colors.blue, borderWidth: 2 }]}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{c.code}</Text>
            <Text style={{ color: colors.muted }}>{c.percent_off}% off the plan for {c.months} month{c.months === 1 ? '' : 's'}</Text>
            <Text style={{ fontWeight: '700', color: colors.ink }}>{c.paid} of {c.max_uses} used · {c.holding} waiting for payment · {Math.max(0, left)} left</Text>
            <Text style={{ fontWeight: '700', color: c.active ? colors.blue : colors.muted }}>{c.active ? 'On: merchants can use it' : 'Off'}</Text>
            <Pressable style={[ui.btn, c.active ? ui.outline : ui.primary, { height: 44 }]} onPress={() => toggle(c)}>
              <Text style={[ui.btnText, { color: c.active ? colors.ink : '#fff' }]}>{c.active ? 'Switch off' : 'Switch on'}</Text>
            </Pressable>
          </View>
        );
      })}
    </>
  );
}

// ---- Support: reply and resolve -------------------------------------------------------------------
function Support() {
  const [rows, setRows] = useState<Ticket[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    supabase.from('support_tickets').select('*,profiles(display_name)').order('status').order('created_at', { ascending: false }).limit(100)
      .then(({ data, error }) => { setErr(error?.message ?? ''); setRows((data as unknown as Ticket[]) ?? []); });
  }, []);
  useFocusEffect(load);
  return (
    <View style={{ gap: 12 }}>
      {!rows && !err && <PinLoader />}
      {!!err && <Text style={ui.error}>{err}</Text>}
      {rows?.length === 0 && <Text style={ui.muted}>No support requests yet.</Text>}
      {rows?.map((t) => <TicketCard key={t.id} t={t} onChanged={load} />)}
    </View>
  );
}

function TicketCard({ t, onChanged }: { t: Ticket; onChanged: () => void }) {
  const [reply, setReply] = useState(t.reply ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function send() {
    setBusy(true); setMsg('');
    const { error } = await supabase.rpc('admin_reply_ticket', { p_ticket: t.id, p_reply: reply, p_resolve: true });
    setBusy(false);
    if (error) return setMsg(error.message);
    onChanged();
  }
  return (
    <View style={[ui.card, { padding: 14, gap: 8, borderColor: t.status === 'open' ? colors.gold : colors.border, borderWidth: t.status === 'open' ? 2 : 1 }]}>
      <Text style={{ fontSize: 13, color: colors.muted }}>{t.profiles?.display_name || 'Merchant'} · {t.topic} · {new Date(t.created_at).toLocaleDateString()} · {t.status}</Text>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{t.subject}</Text>
      <Text style={[ui.muted, { color: colors.ink }]}>{t.body}</Text>
      <TextInput style={[ui.field, { height: 90, paddingTop: 14, textAlignVertical: 'top' }]} multiline placeholder="Your reply" value={reply} onChangeText={setReply} />
      {!!msg && <Text style={ui.error}>{msg}</Text>}
      <Pressable style={[ui.btn, ui.primary, { height: 44 }]} onPress={send} disabled={busy || !reply.trim()}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>{t.reply ? 'Update reply' : 'Send reply and resolve'}</Text>}
      </Pressable>
    </View>
  );
}

// ---- Reports: look, act, resolve ------------------------------------------------------------------
function Reports() {
  const [rows, setRows] = useState<Report[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    supabase.from('reports').select('*,reporter:profiles!reporter_id(display_name)').order('status').order('created_at', { ascending: false }).limit(100)
      .then(({ data, error }) => { setErr(error?.message ?? ''); setRows((data as unknown as Report[]) ?? []); });
  }, []);
  useFocusEffect(load);
  return (
    <View style={{ gap: 12 }}>
      {!rows && !err && <PinLoader />}
      {!!err && <Text style={ui.error}>{err}</Text>}
      {rows?.length === 0 && <Text style={ui.muted}>No reports. 🎉</Text>}
      {rows?.map((r) => <ReportCard key={r.id} r={r} onChanged={load} />)}
    </View>
  );
}

function ReportCard({ r, onChanged }: { r: Report; onChanged: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function open() {
    if (r.target_type === 'listing') return router.push({ pathname: '/service/[id]', params: { id: r.target_id } });
    if (r.target_type === 'review') {
      const { data } = await supabase.from('reviews').select('service_id').eq('id', r.target_id).maybeSingle();
      if (data?.service_id) return router.push({ pathname: '/service/[id]', params: { id: data.service_id } });
      return setMsg('That review no longer exists.');
    }
    router.push({ pathname: '/business/[id]', params: { id: r.target_id } });
  }
  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true); setMsg('');
    const { error } = await fn();
    setBusy(false);
    if (error) return setMsg(error.message);
    onChanged();
  }
  return (
    <View style={[ui.card, { padding: 14, gap: 8, borderColor: r.status === 'open' ? colors.red : colors.border, borderWidth: r.status === 'open' ? 2 : 1 }]}>
      <Text style={{ fontSize: 13, color: colors.muted }}>{r.target_type} · reported by {r.reporter?.display_name || 'a user'} · {new Date(r.created_at).toLocaleDateString()} · {r.status}</Text>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>Reason: {r.reason}</Text>
      {!!r.details && <Text style={[ui.muted, { color: colors.ink }]}>{r.details}</Text>}
      {!!msg && <Text style={ui.error}>{msg}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pressable style={[ui.btn, ui.outline, { height: 40 }]} onPress={open}><Text style={[ui.btnText, { color: colors.ink }]}>Open</Text></Pressable>
        {r.target_type === 'listing' && (
          <Pressable style={[ui.btn, { height: 40, backgroundColor: colors.red }]} disabled={busy}
            onPress={() => run(() => supabase.rpc('admin_hide_listing', { p_service: r.target_id }))}>
            <Text style={[ui.btnText, { color: '#fff' }]}>Hide listing</Text>
          </Pressable>
        )}
      </View>
      {r.status === 'open' && (
        <>
          <TextInput style={ui.field} placeholder="Note (optional): what you did" value={note} onChangeText={setNote} />
          <Pressable style={[ui.btn, ui.primary, { height: 44 }]} disabled={busy}
            onPress={() => run(() => supabase.rpc('admin_resolve_report', { p_report: r.id, p_note: note }))}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Mark resolved</Text>}
          </Pressable>
        </>
      )}
    </View>
  );
}
