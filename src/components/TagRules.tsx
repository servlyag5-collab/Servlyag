import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { colors, fonts, ui } from '../lib/theme';

// The line under the tags box on Offer a service and Edit listing, with an ⓘ "Tag rules" button.
// The rules stop merchants adding unrelated tags to show up in every search (see "What is not allowed"
// in the Terms of Service, src/lib/legal.ts).
const RULES = [
  'Only use tags for the services this listing actually offers. A photographer might use: photographer, photography, wedding photos, events.',
  "Don't add tags for services you don't offer, popular words, or other businesses' names to show up in more searches.",
  'Keep it to a handful of tags that describe this service.',
];

export function TagRules() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: -6 }}>
        <Text style={[ui.muted, { fontSize: 14, lineHeight: 20, flex: 1 }]}>Tags help customers find you in search. They are not shown on your listing.</Text>
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Tag rules"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 }}>
          <Ionicons name="information-circle-outline" size={20} color={colors.blue} />
          <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 14 }}>Tag rules</Text>
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,33,43,0.35)', justifyContent: 'center', padding: 16 }} onPress={() => setOpen(false)}>
          <Pressable style={[ui.card, { width: '100%', maxWidth: 460, alignSelf: 'center', gap: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle" size={24} color={colors.blue} />
              <Text style={{ fontFamily: fonts.title, fontSize: 21, color: colors.ink }}>Tag rules</Text>
            </View>
            {RULES.map((r) => (
              <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue, marginTop: 8 }} />
                <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: colors.ink }}>{r}</Text>
              </View>
            ))}
            {/* The penalty, in its own red box so it stands out. */}
            <View style={{ backgroundColor: '#FDECEE', borderColor: colors.red, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 }}>
              <Text style={{ fontWeight: '800', color: colors.red, fontSize: 15 }}>Breaking these rules has penalties</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: colors.ink }}>
                Listings with tags unrelated to the business may be hidden, suspended or removed. Repeated misuse can lead to the account being closed.
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.muted }}>
              See "What is not allowed" in our{' '}
              <Text style={{ color: colors.blue, fontWeight: '700', textDecorationLine: 'underline' }} onPress={() => { setOpen(false); router.push('/terms' as Href); }}>Terms of Service</Text>.
            </Text>
            <Pressable style={[ui.btn, ui.primary]} onPress={() => setOpen(false)}>
              <Text style={[ui.btnText, { color: '#fff' }]}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
