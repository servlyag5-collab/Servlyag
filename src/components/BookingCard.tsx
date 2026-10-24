import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bookingWhen, cancelBooking, isPast, respondBooking, statusInfo, type Booking } from '../lib/bookings';
import { formatPrice } from '../lib/price';
import { colors, ui } from '../lib/theme';

// A booking, with the right buttons for whoever is looking:
// customer -> Confirm / Decline while pending; merchant -> Cancel (with an "are you sure?" step).
export function BookingCard({ b, iAmMerchant, title, subtitle, onChanged }: {
  b: Booking; iAmMerchant: boolean; title?: string; subtitle?: string; onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [err, setErr] = useState('');
  const s = statusInfo(b, iAmMerchant);
  const live = !isPast(b);

  async function run(fn: () => Promise<void>) {
    setBusy(true); setErr('');
    try { await fn(); onChanged?.(); } catch (e) { setErr((e as Error).message); }
    setBusy(false); setAskCancel(false);
  }

  return (
    <View style={[ui.card, { padding: 14, gap: 8, borderColor: b.status === 'confirmed' && live ? colors.blue : colors.border, borderWidth: b.status === 'confirmed' && live ? 2 : 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="calendar" size={18} color={colors.blue} />
        <Text style={{ flex: 1, fontWeight: '800', color: colors.ink }}>{title ?? 'Booking'}</Text>
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff', backgroundColor: s.color, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' }}>{s.label}</Text>
      </View>
      {!!subtitle && <Text style={{ fontSize: 13, fontWeight: '700', color: colors.blue }}>{subtitle}</Text>}
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{bookingWhen(b.starts_at)}</Text>
      {!!b.note && <Text style={[ui.muted, { color: colors.ink }]}>{b.note}</Text>}
      {b.price != null && <Text style={{ fontWeight: '800', color: colors.blue }}>{formatPrice(b.price)}</Text>}
      {!!err && <Text style={ui.error}>{err}</Text>}

      {!iAmMerchant && b.status === 'pending' && live && (
        <View style={ui.row}>
          <Pressable style={[ui.btn, ui.outline, { flex: 1, height: 44 }]} disabled={busy} onPress={() => run(() => respondBooking(b.id, false))}>
            <Text style={[ui.btnText, { color: colors.ink }]}>Decline</Text>
          </Pressable>
          <Pressable style={[ui.btn, ui.primary, { flex: 1, height: 44 }]} disabled={busy} onPress={() => run(() => respondBooking(b.id, true))}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Confirm</Text>}
          </Pressable>
        </View>
      )}

      {iAmMerchant && (b.status === 'pending' || b.status === 'confirmed') && live && (
        askCancel ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontWeight: '700', color: colors.ink }}>Cancel this booking? The customer will be told in the chat.</Text>
            <View style={ui.row}>
              <Pressable style={[ui.btn, ui.outline, { flex: 1, height: 44 }]} disabled={busy} onPress={() => setAskCancel(false)}>
                <Text style={[ui.btnText, { color: colors.ink }]}>Keep it</Text>
              </Pressable>
              <Pressable style={[ui.btn, { flex: 1, height: 44, backgroundColor: colors.red }]} disabled={busy} onPress={() => run(() => cancelBooking(b.id))}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Yes, cancel</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={[ui.btn, ui.outline, { height: 44 }]} onPress={() => setAskCancel(true)}>
            <Text style={[ui.btnText, { color: colors.red }]}>Cancel booking</Text>
          </Pressable>
        )
      )}
    </View>
  );
}
