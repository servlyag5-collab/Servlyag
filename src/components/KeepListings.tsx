import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Cover } from './Cover';
import { colors, ui } from '../lib/theme';

export type KeepItem = { id: string; title: string; photos: string[]; photo_focus: unknown };

// Plan screen, before moving to a smaller plan: tick which live listings to keep. The rest are paused
// (hidden but saved) when the smaller plan starts, and can only come back by upgrading.
export function KeepListings({ plan, limit, listings, initial = [], onCancel, onConfirm }: {
  plan: string | null; limit: number; listings: KeepItem[]; initial?: string[];
  onCancel: () => void; onConfirm: (keep: string[]) => Promise<string | null>; // returns an error message, or null
}) {
  const need = Math.min(limit, listings.length);
  const [keep, setKeep] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { setKeep(initial.filter((id) => listings.some((l) => l.id === id)).slice(0, need)); setErr(''); }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setErr('');
    if (keep.includes(id)) return setKeep(keep.filter((k) => k !== id));
    if (keep.length < need) return setKeep([...keep, id]);
    if (need === 1) setKeep([id]); // only one allowed: tapping another one swaps the choice
  }

  async function confirm() {
    setBusy(true);
    const e = await onConfirm(keep);
    setBusy(false);
    if (e) setErr(e);
  }

  const paused = listings.length - need;
  return (
    <Modal visible={!!plan} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(11,58,99,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <View style={[ui.card, { width: '100%', maxWidth: 520, maxHeight: '90%' }]}>
          <Text style={ui.h2}>Choose {need === 1 ? 'the listing' : `${need} listings`} to keep</Text>
          <Text style={ui.muted}>
            {plan} allows {limit} live listing{limit === 1 ? '' : 's'}. You have {listings.length}. The {paused === 1 ? 'one' : paused} you
            don't keep will be paused when {plan} starts: hidden from customers, but saved with their photos and reviews.
          </Text>
          <View style={{ backgroundColor: '#FDF3D0', borderRadius: 12, padding: 12 }}>
            <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 20 }}>
              You can't swap paused and live listings later. To bring a paused listing back, upgrade your plan.
            </Text>
          </View>
          <Text style={{ fontWeight: '800', color: keep.length === need ? colors.blue : colors.ink }}>{keep.length} of {need} chosen</Text>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
            {listings.map((l) => {
              const on = keep.includes(l.id);
              return (
                <Pressable key={l.id} onPress={() => toggle(l.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: 2,
                    borderColor: on ? colors.blue : colors.border, backgroundColor: on ? '#EAF3FB' : colors.card }}>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={26} color={colors.blue} />
                  <Cover photos={l.photos} focus={l.photo_focus} title={l.title} width={56} height={56} radius={10} />
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink }} numberOfLines={2}>{l.title}</Text>
                  {!on && keep.length === need && <Text style={{ color: colors.muted, fontSize: 13 }}>Paused</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
          {!!err && <Text style={ui.error}>{err}</Text>}
          <View style={ui.row}>
            <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={onCancel}><Text style={ui.btnText}>Cancel</Text></Pressable>
            <Pressable style={[ui.btn, ui.primary, { flex: 1.6 }, keep.length !== need && { opacity: 0.45 }]} disabled={keep.length !== need || busy} onPress={confirm}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Keep and continue</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
