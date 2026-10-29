import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlagFrame } from '../components/FlagFrame';
import { KeepListings, type KeepItem } from '../components/KeepListings';
import { WideSplit } from '../components/WideSplit';
import { TopBar } from '../components/Menu';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';
import { PinLoader } from '../components/PinLoader';

type T = { id: string; name: string; monthly_price: number; max_services: number | null; priority_rank: number; booking_included: boolean };
const FEATURED = 'plus'; // Growth: shown with the flag frame and a "Most popular" badge
type Me = { id: string; tier_id: string; plan_expires_at: string | null; requested_tier: string | null; booking_requested: boolean };
// A move to a smaller plan waiting for the paid month to end (my_plan_change, v20).
type Change = { next_tier: string | null; next_tier_name: string | null; next_tier_at: string | null; keep_listings: string[] };

export default function Plan() {
  const { next } = useLocalSearchParams<{ next?: string }>(); // 'offer' when coming from Offer a service
  const [tiers, setTiers] = useState<T[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [addon, setAddon] = useState(25);
  const [loadErr, setLoadErr] = useState('');
  // Which plan card has "Add the booking app" ticked (only one at a time).
  const [bookingFor, setBookingFor] = useState<string | null>(null);
  const [live, setLive] = useState<KeepItem[]>([]); // my live listings (not paused), oldest first
  const [change, setChange] = useState<Change | null>(null);
  const [picking, setPicking] = useState<T | null>(null); // smaller plan waiting for "which listings to keep"

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [t, p, a, s, c] = await Promise.all([
        supabase.from('tiers').select('*').order('monthly_price'),
        supabase.from('profiles').select('id,tier_id,plan_expires_at,requested_tier,booking_requested').eq('id', user!.id).single(),
        supabase.from('addons').select('monthly_price').eq('id', 'booking').single(),
        supabase.from('services').select('id,title,photos,photo_focus').eq('merchant_id', user!.id).eq('active', true).eq('paused', false)
          .order('created_at'),
        supabase.rpc('my_plan_change').maybeSingle(),
      ]);
      setLive((s.data as KeepItem[]) ?? []);
      setChange((c.data as Change | null) ?? null);
      if (!p.data) setLoadErr(p.error?.message ?? 'Could not load your plan.');
      const m = p.data as Me | null;
      setTiers((t.data as T[]) ?? []); setMe(m); if (a.data) setAddon(a.data.monthly_price);
      if (m?.booking_requested) setBookingFor(m.requested_tier ?? m.tier_id);
    })();
  }, []);

  const withBooking = (t: T) => !t.booking_included && bookingFor === t.id;

  // Choosing a plan goes straight to checkout. The choice is saved so you know what to activate after payment.
  // A plan with fewer listings than I have live asks which ones to keep first.
  function choose(t: T) {
    if (t.max_services !== null && live.length > t.max_services) return setPicking(t);
    go(t);
  }
  async function keepAndGo(t: T, keep: string[]) {
    const { error } = await supabase.rpc('choose_listings_to_keep', { p_tier: t.id, p_keep: keep });
    if (error) return error.message;
    setPicking(null);
    go(t);
    return null;
  }
  async function go(t: T) {
    if (!me) return;
    const booking = withBooking(t);
    await supabase.from('profiles').update({ requested_tier: t.id, booking_requested: booking }).eq('id', me.id);
    router.push({ pathname: '/checkout', params: { tier: t.id, booking: booking ? '1' : '0', ...(next ? { next } : {}) } });
  }

  const active = !!me?.plan_expires_at && new Date(me.plan_expires_at) > new Date();
  const current = tiers.find((t) => t.id === me?.tier_id);
  const keptTitles = (change?.keep_listings ?? []).map((id) => live.find((l) => l.id === id)?.title).filter(Boolean).join(', ');

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        <WideSplit>
        <Text style={ui.h1}>{next === 'offer' ? 'Choose a plan to start selling' : 'Your plan'}</Text>
        {next === 'offer' && <Text style={ui.muted}>Your plan decides how many services you can list. You'll create your listing right after checkout.</Text>}
        <Text style={[ui.muted, { fontSize: 14, lineHeight: 20 }]}>
          Plans renew every month until you cancel. No refund once a month has started.{' '}
          <Text style={{ color: colors.blue, fontWeight: '700', textDecorationLine: 'underline' }} onPress={() => router.push('/refunds' as Href)}>
            Refund and Cancellation Policy
          </Text>
        </Text>
        {!me ? (loadErr ? <Text style={ui.error}>{loadErr}</Text> : <PinLoader />) : (
          <>
            <Text style={{ fontSize: 16, color: active ? colors.blue : colors.red, fontWeight: '700' }}>
              {active ? `${current?.name} · active until ${new Date(me.plan_expires_at!).toLocaleDateString()}` : 'No active plan. Your listings are hidden from customers until you pay.'}
            </Text>
            {!!change?.next_tier && (
              <View style={[ui.card, { borderColor: colors.gold, borderWidth: 2, gap: 6 }]}>
                <Text style={ui.h2}>Moving to {change.next_tier_name} on {new Date(change.next_tier_at!).toLocaleDateString()}</Text>
                <Text style={ui.muted}>
                  You keep {current?.name} until then.{keptTitles ? ` You're keeping: ${keptTitles}.` : ''} Other listings over the {change.next_tier_name} limit
                  will be paused. Renew {current?.name} before then to stay on it.
                </Text>
              </View>
            )}
            {tiers.map((t) => {
              const isCurrent = active && me.tier_id === t.id;
              const price = t.monthly_price + (withBooking(t) ? addon : 0);
              const body = (
                <>
                  {isCurrent &&<Text style={{ color: colors.blue, fontWeight: '800', letterSpacing: 2, fontSize: 12 }}>YOUR CURRENT PLAN</Text>}
                  <Text style={ui.h2}>{t.name} · {t.monthly_price} XCD / month</Text>
                  <Text style={ui.muted}>Business profile, customer messaging and call</Text>
                  <Text style={ui.muted}>{t.max_services ?? 'Unlimited'} service listing{t.max_services === 1 ? '' : 's'}</Text>
                  {t.priority_rank > 0 && <Text style={ui.muted}>{t.priority_rank > 1 ? 'Top placement in search' : 'Priority placement in search'}</Text>}
                  {t.booking_included ? <Text style={ui.muted}>Booking app included</Text> : (
                    <Pressable style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }} onPress={() => setBookingFor(bookingFor === t.id ? null : t.id)}>
                      <Ionicons name={withBooking(t) ? 'checkbox' : 'square-outline'} size={26} color={colors.blue} />
                      <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>Add the booking app (+{addon} XCD / month)</Text>
                    </Pressable>
                  )}
                  <Pressable style={[ui.btn, ui.primary]} onPress={() => choose(t)}>
                    <Text style={[ui.btnText, { color: '#fff' }]}>{isCurrent ? 'Renew' : 'Choose'} {t.name} · {price} XCD</Text>
                  </Pressable>
                </>
              );
              // Growth is highlighted: the flag-ribbon frame from the Home screen and a "Most popular" badge.
              if (t.id === FEATURED) return <FlagFrame key={t.id} badge="MOST POPULAR">{body}</FlagFrame>;
              return <View key={t.id} style={[ui.card, isCurrent && { borderColor: colors.blue, borderWidth: 2 }]}>{body}</View>;
            })}
          </>
        )}
        </WideSplit>
      </ScrollView>
      <KeepListings plan={picking?.name ?? null} limit={picking?.max_services ?? 0} listings={live} initial={change?.keep_listings}
        onCancel={() => setPicking(null)} onConfirm={(keep) => keepAndGo(picking!, keep)} />
    </SafeAreaView>
  );
}
