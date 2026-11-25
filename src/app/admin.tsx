import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/Menu';
import { antigua, bookingDay } from '../lib/bookings';
import { DateTimePicker, type Pick } from '../components/DateTimePicker';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';
import { PinLoader } from '../components/PinLoader';
import { DeleteListing } from '../components/DeleteListing';
import { crashReportingOn, sendTestError } from '../lib/crash';

// Admin > Reports, at the bottom (owner 2026-11-24; it used to show under every tab): check that Sentry emails the owner when the app hits an error (a harmless test error).
function CrashTest() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'off'>('idle');
  return (
    <View style={[ui.card, { padding: 14, gap: 8, marginTop: 12 }]}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>Bug alerts (Sentry)</Text>
      <Text style={ui.muted}>
        {crashReportingOn
          ? 'When the app hits a problem, Sentry emails you. Send a harmless test error to check the email arrives (usually within a few minutes).'
          : 'Crash reporting works in the phone app only. Open Admin in the Servly app on your phone to send a test.'}
      </Text>
      {crashReportingOn && (
        <Pressable style={[ui.btn, ui.outline, { height: 44 }]} disabled={state === 'sending'}
          onPress={async () => { setState('sending'); setState((await sendTestError()) ? 'sent' : 'off'); }}>
          {state === 'sending' ? <ActivityIndicator color={colors.blue} />
            : <Text style={[ui.btnText, { color: colors.ink }]}>Send a test error</Text>}
        </Pressable>
      )}
      {state === 'sent' && <Text style={{ color: colors.blue, fontWeight: '700' }}>Test error sent. Check your email (and Sentry's Issues page) in a few minutes.</Text>}
      {state === 'off' && <Text style={ui.error}>Crash reporting is off in this app version.</Text>}
    </View>
  );
}

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
  const [tab, setTab] = useState<'merchants' | 'support' | 'reports' | 'promos' | 'searches'>('merchants');
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.field, borderRadius: 12, padding: 4, gap: 4 }}>
              {(['merchants', 'support', 'reports', 'promos', 'searches'] as const).map((t) => (
                <Pressable key={t} onPress={() => setTab(t)}
                  style={{ flexGrow: 1, flexBasis: '30%', height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t ? colors.blue : 'transparent' }}>
                  <Text style={{ fontWeight: '800', color: tab === t ? '#fff' : colors.muted }}>{t[0].toUpperCase() + t.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
            {tab === 'merchants' && <Merchants />}
            {tab === 'support' && <Support />}
            {tab === 'reports' && <><Reports /><CrashTest /></>}
            {tab === 'promos' && <Promos />}
            {tab === 'searches' && <Searches />}
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
        <TextInput placeholderTextColor={colors.muted} style={[ui.field, { flex: 1 }]} placeholder="Search name or email" autoCapitalize="none" value={q} onChangeText={setQ} onSubmitEditing={() => load()} />
        <Pressable style={[ui.btn, ui.primary]} onPress={() => load()}><Ionicons name="search" size={20} color="#fff" /></Pressable>
      </View>
      {!rows && !err && <PinLoader />}
      {!!err && <Text style={ui.error}>{err}</Text>}
      {rows?.length === 0 && <Text style={ui.muted}>No matches.</Text>}
      {rows?.map((m) => <MerchantCard key={m.id} m={m} onChanged={() => load()} />)}
    </View>
  );
}

// Founding Merchant trials end 60 days after launch (launch 7 January 2027, owner's decision 2026-11-12),
// unless the owner picks another date. After that date has passed, the picker starts empty.
const TRIAL_END_DEFAULT = { y: 2027, m: 2, d: 8 }; // 8 March 2027 (months count from 0)
function defaultTrialEnd(): Pick {
  const t = antigua(new Date()), e = TRIAL_END_DEFAULT;
  return Date.UTC(e.y, e.m, e.d) > Date.UTC(t.y, t.m, t.d) ? { ...e, h: -1, min: 0 } : null;
}

function MerchantCard({ m, onChanged }: { m: Merchant; onChanged: () => void }) {
  const [tier, setTier] = useState(m.requested_tier ?? m.tier_id);
  const [booking, setBooking] = useState(m.booking_requested);
  const [trialEnd, setTrialEnd] = useState<Pick>(defaultTrialEnd); // the day the free trial ends
  const [showCal, setShowCal] = useState(false);
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

  // Days from today to the chosen end date (Antigua calendar days); the trial then ends on that date.
  const today = antigua(new Date());
  const trialDays = trialEnd ? Math.round((Date.UTC(trialEnd.y, trialEnd.m, trialEnd.d) - Date.UTC(today.y, today.m, today.d)) / 86400000) : 0;
  const trialOk = trialDays >= 1 && trialDays <= 365;
  const endLabel = trialEnd ? bookingDay(new Date(Date.UTC(trialEnd.y, trialEnd.m, trialEnd.d, 16)).toISOString()) : '';
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
      {/* Why the free trial isn't offered: it's only for merchants with no plan yet and no earlier trial. */}
      {(m.trial_ends_at || active) && (
        <Text style={[ui.muted, { fontSize: 14 }]}>
          Free trial: not available. {m.trial_ends_at ? 'They already had one (one per merchant).' : 'They already have an active plan. Trials are for merchants who have not started yet.'}
        </Text>
      )}
      {!m.trial_ends_at && !active && (
        // Founding Merchants: the chosen plan (and booking app, if ticked) free until the date picked here
        // (starts set to 60 days after launch). One trial per merchant, so check the date before starting.
        <View style={{ gap: 8 }}>
          <Pressable onPress={() => setShowCal(!showCal)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
            <Ionicons name="calendar-outline" size={20} color={colors.blue} />
            <Text style={{ flex: 1, color: colors.ink, fontWeight: '700' }}>Free trial ends on {endLabel || '(pick a date)'}{trialOk ? ` · ${trialDays} days` : ''}</Text>
            <Text style={{ color: colors.blue, fontWeight: '700' }}>{showCal ? 'Done' : 'Change'}</Text>
          </Pressable>
          {showCal && <DateTimePicker dateOnly value={trialEnd} onChange={(v) => { setTrialEnd(v); setShowCal(false); }} />}
          <Pressable style={[ui.btn, ui.outline, { height: 44, borderColor: colors.blue }]} disabled={busy || !trialOk}
            onPress={() => act(() => supabase.rpc('admin_start_free_trial', { p_user: m.id, p_tier: tier, p_days: trialDays, p_booking: booking }),
              `Free trial started: ${tierName(tier)} until ${endLabel}.`)}>
            <Text style={[ui.btnText, { color: trialOk ? colors.blue : colors.muted }]}>{trialOk ? `Start free trial until ${endLabel}` : 'Pick an end date within a year'}</Text>
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
              <View key={l.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/service/[id]', params: { id: l.id } })}>
                  <Text style={{ fontWeight: '700', color: colors.ink }} numberOfLines={1}>{l.title}</Text>
                  <Text style={{ fontSize: 13, color: status === 'Live' ? colors.blue : colors.muted }}>{status} · 📞 {l.calls_month ?? 0} this month, {l.calls_total ?? 0} overall</Text>
                </Pressable>
                <Pressable style={[ui.btn, live ? ui.outline : ui.primary, { height: 38, paddingHorizontal: 14 }]} disabled={busy}
                  onPress={() => act(() => supabase.rpc('admin_set_listing_on', { p_service: l.id, p_on: !live }), `Listing "${l.title}" turned ${live ? 'off' : 'on'}.`)}>
                  <Text style={[ui.btnText, { color: live ? colors.ink : '#fff', fontSize: 14 }]}>Turn {live ? 'off' : 'on'}</Text>
                </Pressable>
              </View>
              <DeleteListing serviceId={l.id} title={l.title} removePhotos={false} compact
                onDeleted={() => { setMsg(`Listing "${l.title}" deleted.`); onChanged(); loadListings(); }} />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ---- Searches (v39): what people search for, ranked, and what they couldn't find --------------------------------
// Never who searched. "Not found" first: those are the businesses to sign up or to market to.
type Top = { q: string; searches: number; no_results: number; last_at: string };
type Unmet = { q: string; place: string; searches: number; last_at: string };
type Rising = { q: string; this_week: number; last_week: number };
type Place = { place: string; searches: number; no_results: number };
function Searches() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<{ top: Top[]; unmet: Unmet[]; rising: Rising[]; places: Place[] } | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    setData(null); setErr('');
    Promise.all([
      supabase.rpc('admin_unmet_searches', { p_days: days, p_limit: 30 }),
      supabase.rpc('admin_top_searches', { p_days: days, p_limit: 30 }),
      supabase.rpc('admin_rising_searches', { p_limit: 15 }),
      supabase.rpc('admin_search_places', { p_days: days }),
    ]).then(([u, t, r, p]) => {
      const e = u.error ?? t.error ?? r.error ?? p.error;
      if (e) return setErr(/admin_unmet_searches|function/.test(e.message) ? 'Run database update v39 to see searches.' : e.message);
      setData({ unmet: (u.data as Unmet[]) ?? [], top: (t.data as Top[]) ?? [], rising: (r.data as Rising[]) ?? [], places: (p.data as Place[]) ?? [] });
    });
  }, [days]);
  useFocusEffect(load);

  const head = (title: string, note: string) => (
    <View style={{ gap: 2, marginTop: 6 }}>
      <Text style={ui.h2}>{title}</Text>
      <Text style={[ui.muted, { fontSize: 14 }]}>{note}</Text>
    </View>
  );
  const item = (rank: number, left: string, sub: string, right: string, key: string, color = colors.ink) => (
    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border }}>
      <Text style={{ width: 26, textAlign: 'right', color: colors.muted, fontWeight: '700' }}>{rank}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: colors.ink, fontSize: 16 }} numberOfLines={1}>{left}</Text>
        {!!sub && <Text style={{ color: colors.muted, fontSize: 13 }} numberOfLines={1}>{sub}</Text>}
      </View>
      <Text style={{ fontWeight: '800', color, fontSize: 16 }}>{right}</Text>
    </View>
  );
  const none = (t: string) => <Text style={ui.muted}>{t}</Text>;
  const ago = (iso: string) => `last ${bookingDay(iso)}`;

  return (
    <View style={{ gap: 10 }}>
      <Text style={ui.muted}>What people search for on Servly. Only the words, parish and village are kept, never who searched. Searches older than 12 months are deleted.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[7, 30, 90].map((d) => (
          <Pressable key={d} style={chip(days === d)} onPress={() => setDays(d)}><Text style={chipText(days === d)}>Last {d} days</Text></Pressable>
        ))}
      </View>
      {!!err && <Text style={ui.error}>{err}</Text>}
      {!data && !err && <PinLoader />}
      {data && (
        <>
          <View style={[ui.card, { padding: 14, gap: 4, borderColor: colors.red, borderWidth: 2 }]}>
            {head('Searched, but nothing found', 'Businesses to sign up, or to market to. Where people searched is shown under each one.')}
            {data.unmet.length === 0 ? none('Nothing yet. Every search found something.')
              : data.unmet.map((r, i) => item(i + 1, r.q || '(only a place)', `${r.place} · ${ago(r.last_at)}`, `${r.searches}×`, `u${i}`, colors.red))}
          </View>
          <View style={[ui.card, { padding: 14, gap: 4 }]}>
            {head('Top searches', 'Most searched first. "Not found" shows how many of those found nothing.')}
            {data.top.length === 0 ? none('No searches yet.')
              : data.top.map((r, i) => item(i + 1, r.q, r.no_results > 0 ? `${r.no_results} not found · ${ago(r.last_at)}` : ago(r.last_at), `${r.searches}×`, `t${i}`))}
          </View>
          <View style={[ui.card, { padding: 14, gap: 4 }]}>
            {head('Rising this week', 'Searched at least 3 times this week and more than last week.')}
            {data.rising.length === 0 ? none('Nothing rising right now.')
              : data.rising.map((r, i) => item(i + 1, r.q, `last week ${r.last_week}`, `${r.this_week}×`, `r${i}`, colors.blue))}
          </View>
          <View style={[ui.card, { padding: 14, gap: 4 }]}>
            {head('Where people search', 'The parish or village picked in the search ("Anywhere" = none picked).')}
            {data.places.length === 0 ? none('No searches yet.')
              : data.places.map((r, i) => item(i + 1, r.place, r.no_results > 0 ? `${r.no_results} found nothing` : '', `${r.searches}×`, `p${i}`))}
          </View>
        </>
      )}
    </View>
  );
}

// ---- Founding invites (v41): a personal code locked to one email; entering it starts that business's free trial ----
type Invite = { code: string; email: string; tier_name: string; booking: boolean; trial_ends: string; created_at: string;
  used_at: string | null; used_by_name: string | null };
const dayOf = (d: string) => bookingDay(new Date(`${d}T16:00:00Z`).toISOString()); // a date (yyyy-mm-dd) as Antigua shows it
function InvitesCard() {
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState('basic');
  const [booking, setBooking] = useState(false);
  const [ends, setEnds] = useState<Pick>(defaultTrialEnd);
  const [showCal, setShowCal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ code: string; email: string } | null>(null);
  const [rows, setRows] = useState<Invite[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    supabase.rpc('admin_invites').then(({ data, error }) => {
      if (error) return setErr(error.message.includes('admin_invites') ? 'Run database update v41 to use invite codes.' : error.message);
      setRows((data as Invite[]) ?? []);
    });
  }, []);
  useFocusEffect(load);
  const endsIso = ends ? `${ends.y}-${String(ends.m + 1).padStart(2, '0')}-${String(ends.d).padStart(2, '0')}` : '';
  async function create() {
    setBusy(true); setErr(''); setMade(null);
    const { data, error } = await supabase.rpc('admin_create_invite', { p_email: email, p_tier: tier, p_booking: booking, p_ends: endsIso });
    setBusy(false);
    if (error) return setErr(error.message);
    setMade({ code: data as string, email: email.trim().toLowerCase() }); setEmail(''); load();
  }
  async function cancel(code: string) {
    const { error } = await supabase.rpc('admin_cancel_invite', { p_code: code });
    if (error) return setErr(error.message);
    load();
  }
  const message = made && `Welcome to Servly! Your Founding Business code is ${made.code}. Sign up with ${made.email}, then open Plan and enter the code to start your free trial until ${endsIso ? dayOf(endsIso) : 'the date we agreed'}.`;
  return (
    <View style={[ui.card, { padding: 14, gap: 8 }]}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>Founding invites</Text>
      <Text style={ui.muted}>A personal code for one business. It only works for the account signed up with that email, and only once. Entering it on the Plan screen starts their free trial.</Text>
      <TextInput placeholderTextColor={colors.muted} style={[ui.field, { height: 44 }]} placeholder="Their email address" value={email}
        onChangeText={(v) => { setEmail(v); setErr(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TIERS.map((t) => (
          <Pressable key={t.id} style={chip(tier === t.id)} onPress={() => setTier(t.id)}><Text style={chipText(tier === t.id)}>{t.name}</Text></Pressable>
        ))}
        {tier !== 'premium' && <Pressable style={chip(booking)} onPress={() => setBooking(!booking)}><Text style={chipText(booking)}>+ booking app</Text></Pressable>}
      </View>
      <Pressable onPress={() => setShowCal(!showCal)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
        <Ionicons name="calendar-outline" size={20} color={colors.blue} />
        <Text style={{ flex: 1, color: colors.ink, fontWeight: '700' }}>Free trial ends on {endsIso ? dayOf(endsIso) : '(pick a date)'}</Text>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>{showCal ? 'Done' : 'Change'}</Text>
      </Pressable>
      {showCal && <DateTimePicker dateOnly value={ends} onChange={(v) => { setEnds(v); setShowCal(false); }} />}
      <Pressable style={[ui.btn, ui.primary, { height: 44 }]} disabled={busy || !email.trim() || !endsIso} onPress={create}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Make a code</Text>}
      </Pressable>
      {!!err && <Text style={ui.error}>{err}</Text>}
      {made && (
        <View style={{ borderWidth: 2, borderColor: colors.gold, borderRadius: 14, padding: 12, gap: 6 }}>
          <Text selectable style={{ fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: 2 }}>{made.code}</Text>
          <Text style={ui.muted}>For {made.email}. Send them this message:</Text>
          <Text selectable style={{ color: colors.ink }}>{message}</Text>
          <Pressable style={[ui.btn, ui.outline, { height: 40 }]} onPress={() => Share.share({ message: message! }).catch(() => {})}>
            <Text style={[ui.btnText, { color: colors.ink }]}>Share message</Text>
          </Pressable>
        </View>
      )}
      {rows && rows.length > 0 && (
        <View style={{ gap: 6, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 }}>
          {rows.map((r) => (
            <View key={r.code} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: colors.ink }} selectable>{r.code} · <Text style={{ fontWeight: '600' }}>{r.email}</Text></Text>
                <Text style={{ fontSize: 13, color: r.used_at ? colors.blue : colors.muted }}>
                  {r.tier_name}{r.booking ? ' + bookings' : ''} · until {dayOf(r.trial_ends)} · {r.used_at ? `Used by ${r.used_by_name || 'them'} on ${bookingDay(r.used_at)}` : 'Not used yet'}
                </Text>
              </View>
              {!r.used_at && (
                <Pressable onPress={() => cancel(r.code)} hitSlop={8}><Text style={{ color: colors.red, fontWeight: '700' }}>Cancel</Text></Pressable>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ---- ABST (v37): Antigua and Barbuda Sales Tax on Servly's own sales, on/off + registration number -------------
// Off until Servly is registered with Inland Revenue. Switching on needs the registration number (it prints on
// receipts); from then on every payment, including automatic monthly ones, adds 17% on top.
function AbstCard() {
  const [s, setS] = useState<{ abst_on: boolean; abst_rate: number; abst_number: string | null } | null>(null);
  const [num, setNum] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    supabase.from('tax_settings').select('abst_on,abst_rate,abst_number').maybeSingle().then(({ data, error }) => {
      if (error) return setErr(error.message.includes('tax_settings') ? 'Run database update v37 to use ABST.' : error.message);
      if (data) { setS(data as typeof s); setNum(data.abst_number ?? ''); }
    });
  }, []);
  useFocusEffect(load);
  async function save(on: boolean) {
    setBusy(true); setErr('');
    const { error } = await supabase.rpc('admin_set_abst', { p_on: on, p_number: num });
    setBusy(false); setConfirm(false);
    if (error) return setErr(error.message);
    load();
  }
  const rate = s ? Number(Number(s.abst_rate).toFixed(2)) : 17;
  return (
    <View style={[ui.card, { padding: 14, gap: 8 }, s?.abst_on && { borderColor: colors.blue, borderWidth: 2 }]}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>ABST ({rate}%)</Text>
      {!!err && <Text style={ui.error}>{err}</Text>}
      {s && (
        <>
          <Text style={{ fontWeight: '700', color: s.abst_on ? colors.blue : colors.muted }}>
            {s.abst_on ? `On: ${rate}% is added to every payment, including automatic monthly ones.` : 'Off: no ABST is charged.'}
          </Text>
          <Text style={ui.muted}>Switch it on only once Servly is registered for ABST with Inland Revenue. Your registration number prints on every receipt.</Text>
          <Text style={{ fontWeight: '700', color: colors.ink }}>ABST registration number</Text>
          <TextInput placeholderTextColor={colors.muted} style={[ui.field, { height: 44 }]} value={num} onChangeText={(v) => { setNum(v); setErr(''); }}
            placeholder="From Inland Revenue" autoCapitalize="characters" autoCorrect={false} editable={!s.abst_on} />
          {confirm ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: '700', color: colors.ink }}>
                {s.abst_on ? 'Stop charging ABST from the next payment?' : `Charge ${rate}% ABST on every payment from now on, including automatic monthly ones?`}
              </Text>
              <View style={ui.row}>
                <Pressable style={[ui.btn, ui.outline, { flex: 1, height: 44 }]} onPress={() => setConfirm(false)}>
                  <Text style={[ui.btnText, { color: colors.ink }]}>Cancel</Text>
                </Pressable>
                <Pressable style={[ui.btn, ui.primary, { flex: 1, height: 44 }]} disabled={busy} onPress={() => save(!s.abst_on)}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>{s.abst_on ? 'Yes, switch off' : 'Yes, switch on'}</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={[ui.btn, s.abst_on ? ui.outline : ui.primary, { height: 44 }]} disabled={!s.abst_on && !num.trim()} onPress={() => setConfirm(true)}>
              <Text style={[ui.btnText, { color: s.abst_on ? colors.ink : !num.trim() ? colors.muted : '#fff' }]}>
                {s.abst_on ? 'Switch ABST off' : num.trim() ? 'Switch ABST on' : 'Enter the number to switch on'}
              </Text>
            </Pressable>
          )}
        </>
      )}
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
      <InvitesCard />
      <AbstCard />
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
      <TextInput placeholderTextColor={colors.muted} style={[ui.field, { height: 90, paddingTop: 14, textAlignVertical: 'top' }]} multiline placeholder="Your reply" value={reply} onChangeText={setReply} />
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
          <TextInput placeholderTextColor={colors.muted} style={ui.field} placeholder="Note (optional): what you did" value={note} onChangeText={setNote} />
          <Pressable style={[ui.btn, ui.primary, { height: 44 }]} disabled={busy}
            onPress={() => run(() => supabase.rpc('admin_resolve_report', { p_report: r.id, p_note: note }))}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Mark resolved</Text>}
          </Pressable>
        </>
      )}
    </View>
  );
}
