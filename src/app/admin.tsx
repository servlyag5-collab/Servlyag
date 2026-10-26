import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/Menu';
import { bookingDay } from '../lib/bookings';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

// The owner's dashboard (admins only; add yourself with the SQL at the top of upgrade-v14-launch-ready.sql).
// Merchants: activate/renew plans and switch the booking app. Support: reply to requests. Reports: review and act.
type Merchant = { id: string; display_name: string; email: string; tier_id: string; plan_expires_at: string | null;
  requested_tier: string | null; booking_requested: boolean; listings: number; has_booking: boolean };
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
  const [tab, setTab] = useState<'merchants' | 'support' | 'reports'>('merchants');
  useFocusEffect(useCallback(() => { supabase.rpc('is_admin').then(({ data }) => setAllowed(!!data)); }, []));

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page} keyboardShouldPersistTaps="handled">
        <TopBar />
        <Text style={ui.h1}>Admin</Text>
        {allowed === null ? <ActivityIndicator color={colors.blue} /> : !allowed ? (
          <Text style={ui.muted}>This page is for Servly admins only.</Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', backgroundColor: colors.field, borderRadius: 12, padding: 4, gap: 4 }}>
              {(['merchants', 'support', 'reports'] as const).map((t) => (
                <Pressable key={t} onPress={() => setTab(t)}
                  style={{ flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t ? colors.blue : 'transparent' }}>
                  <Text style={{ fontWeight: '800', color: tab === t ? '#fff' : colors.muted }}>{t[0].toUpperCase() + t.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
            {tab === 'merchants' && <Merchants />}
            {tab === 'support' && <Support />}
            {tab === 'reports' && <Reports />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Merchants: find, activate/renew a plan, booking app on/off ------------------------------------
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
      <Text style={ui.muted}>People who chose a plan but haven't been activated are listed first. After a merchant pays, activate their plan here: it adds one month and creates their receipt.</Text>
      <View style={ui.row}>
        <TextInput style={[ui.field, { flex: 1 }]} placeholder="Search name or email" autoCapitalize="none" value={q} onChangeText={setQ} onSubmitEditing={() => load()} />
        <Pressable style={[ui.btn, ui.primary]} onPress={() => load()}><Ionicons name="search" size={20} color="#fff" /></Pressable>
      </View>
      {!rows && !err && <ActivityIndicator color={colors.blue} />}
      {!!err && <Text style={ui.error}>{err}</Text>}
      {rows?.length === 0 && <Text style={ui.muted}>No matches.</Text>}
      {rows?.map((m) => <MerchantCard key={m.id} m={m} onChanged={() => load()} />)}
    </View>
  );
}

function MerchantCard({ m, onChanged }: { m: Merchant; onChanged: () => void }) {
  const [tier, setTier] = useState(m.requested_tier ?? m.tier_id);
  const [booking, setBooking] = useState(m.booking_requested);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const active = !!m.plan_expires_at && new Date(m.plan_expires_at) > new Date();

  async function act(fn: () => PromiseLike<{ error: { message: string } | null }>, done: string) {
    setBusy(true); setMsg('');
    const { error } = await fn();
    setBusy(false);
    setMsg(error ? error.message : done);
    if (!error) onChanged();
  }

  return (
    <View style={[ui.card, { padding: 14, gap: 8 }]}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{m.display_name || 'No name'}</Text>
      <Text style={{ color: colors.muted }}>{m.email} · {m.listings} listing{m.listings === 1 ? '' : 's'}</Text>
      <Text style={{ fontWeight: '700', color: active ? colors.blue : colors.red }}>
        {active ? `${tierName(m.tier_id)} · active until ${bookingDay(m.plan_expires_at!)}` : 'No active plan'}
        {m.has_booking ? ' · booking app on' : ''}
      </Text>
      {!!m.requested_tier && (
        <Text style={{ fontWeight: '700', color: '#B07C00' }}>Chose {tierName(m.requested_tier)}{m.booking_requested ? ' + booking app' : ''}: waiting for activation</Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {TIERS.map((t) => (
          <Pressable key={t.id} style={chip(tier === t.id)} onPress={() => setTier(t.id)}><Text style={chipText(tier === t.id)}>{t.name}</Text></Pressable>
        ))}
        <Pressable style={chip(booking)} onPress={() => setBooking(!booking)}><Text style={chipText(booking)}>+ booking app</Text></Pressable>
      </View>
      {!!msg && <Text style={/^(Plan|Booking)/.test(msg) ? { color: colors.blue, fontWeight: '700' } : ui.error}>{msg}</Text>}
      <View style={ui.row}>
        <Pressable style={[ui.btn, ui.primary, { flex: 1, height: 44 }]} disabled={busy}
          onPress={() => act(() => supabase.rpc('admin_activate_plan', { p_user: m.id, p_tier: tier, p_booking: booking }), `Plan activated: ${tierName(tier)} for one month.`)}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>{active ? 'Renew 1 month' : 'Activate 1 month'}</Text>}
        </Pressable>
        <Pressable style={[ui.btn, ui.outline, { height: 44 }]} disabled={busy}
          onPress={() => act(() => supabase.rpc('admin_set_booking', { p_user: m.id, p_on: !m.has_booking }), `Booking app switched ${m.has_booking ? 'off' : 'on'}.`)}>
          <Text style={[ui.btnText, { color: colors.ink }]}>Booking {m.has_booking ? 'off' : 'on'}</Text>
        </Pressable>
      </View>
    </View>
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
      {!rows && !err && <ActivityIndicator color={colors.blue} />}
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
      {!rows && !err && <ActivityIndicator color={colors.blue} />}
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
