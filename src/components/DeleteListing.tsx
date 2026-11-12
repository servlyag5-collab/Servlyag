import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

// "Delete listing" (database v35), for the merchant on Edit listing and for admins on Admin > Merchants.
// Asks first, saying what happens (and how many upcoming bookings get cancelled), then deletes for good.
// The merchant's own photos are removed from storage here; an admin can't remove another user's files.
export function DeleteListing({ serviceId, title, removePhotos, onDeleted, compact }: {
  serviceId: string; title: string; removePhotos: boolean; onDeleted: () => void; compact?: boolean;
}) {
  const [asking, setAsking] = useState<number | null>(null); // upcoming bookings, while the question is open
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function ask() {
    setErr(''); setBusy(true);
    const { data, error } = await supabase.rpc('listing_upcoming_bookings', { p_service: serviceId });
    setBusy(false);
    if (error) return setErr(error.message);
    setAsking(Number(data ?? 0));
  }

  async function remove() {
    setErr(''); setBusy(true);
    const { data, error } = await supabase.rpc('delete_listing', { p_service: serviceId }).maybeSingle();
    if (error) { setBusy(false); return setErr(error.message); }
    const photos = ((data as { photos: string[] | null } | null)?.photos ?? []).filter(Boolean);
    if (removePhotos && photos.length) await supabase.storage.from('service-photos').remove(photos);
    setBusy(false);
    onDeleted();
  }

  if (asking === null) {
    return (
      <View style={{ gap: 6 }}>
        <Pressable style={[ui.btn, ui.outline, { borderColor: colors.red }, compact && { height: 40 }]} onPress={ask} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.red} /> : <Text style={[ui.btnText, { color: colors.red }]}>Delete listing</Text>}
        </Pressable>
        {!!err && <Text style={ui.error}>{err}</Text>}
      </View>
    );
  }

  return (
    <View style={[ui.card, { borderColor: colors.red, borderWidth: 2, gap: 8 }]}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>Delete "{title}"?</Text>
      <Text style={[ui.muted, { fontSize: 14, lineHeight: 20 }]}>
        Customers won't see it any more, and it frees a place on your plan. Its reviews stay on the business profile, marked
        "no longer offered". Chats about it stay as history, but no new messages can be sent there.
      </Text>
      {asking > 0 && (
        <Text style={{ color: colors.red, fontWeight: '700', fontSize: 14, lineHeight: 20 }}>
          This will cancel {asking === 1 ? '1 upcoming booking' : `${asking} upcoming bookings`}, and the {asking === 1 ? 'customer is' : 'customers are'} told in the chat.
        </Text>
      )}
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 14 }}>This can't be undone.</Text>
      {!!err && <Text style={ui.error}>{err}</Text>}
      <View style={ui.row}>
        <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={() => setAsking(null)} disabled={busy}>
          <Text style={ui.btnText}>Keep it</Text>
        </Pressable>
        <Pressable style={[ui.btn, { flex: 1, backgroundColor: colors.red }]} onPress={remove} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={[ui.btnText, { color: '#fff' }]}>Delete</Text>}
        </Pressable>
      </View>
    </View>
  );
}
