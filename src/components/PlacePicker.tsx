import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, ui } from '../lib/theme';

// A box that opens a searchable list (e.g. the parishes, or the villages in src/lib/places.ts).
// Merchants pick one, or type a place that isn't listed and use exactly what they typed.
// boxStyle / textColor / placeholderColor let the box match where it sits (e.g. the dark Home hero).
export function PlacePicker({ label, value, onChange, options, placeholder, boxStyle, textColor = colors.ink, placeholderColor = colors.muted }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
  boxStyle?: StyleProp<ViewStyle>; textColor?: string; placeholderColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const typed = q.trim();
  const shown = options.filter((o) => o.toLowerCase().includes(typed.toLowerCase()));
  const exact = options.some((o) => o.toLowerCase() === typed.toLowerCase());
  const choose = (v: string) => { onChange(v); setOpen(false); setQ(''); };

  return (
    <>
      <Pressable style={[ui.field, { flexDirection: 'row', alignItems: 'center', gap: 8 }, boxStyle]} onPress={() => setOpen(true)}
        accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'not chosen'}`}>
        <Text style={{ flex: 1, fontSize: 16, color: value ? textColor : placeholderColor }} numberOfLines={1}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={placeholderColor} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,33,43,0.35)', justifyContent: 'center', padding: 16 }} onPress={() => setOpen(false)}>
          <Pressable style={[ui.card, { width: '100%', maxWidth: 440, maxHeight: '80%', alignSelf: 'center', padding: 14, gap: 10 }]}>
            <Text style={{ fontFamily: fonts.title, fontSize: 20, color: colors.ink, paddingHorizontal: 4 }}>{label}</Text>
            <TextInput style={ui.field} placeholder="Search or type a place" value={q} onChangeText={setQ} autoFocus autoCorrect={false} />
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 2 }}>
              {/* Not in the list? Use what they typed. */}
              {!!typed && !exact && (
                <Pressable onPress={() => choose(typed)} style={{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#EAF3FB' }}>
                  <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>Use "{typed}"</Text>
                </Pressable>
              )}
              {shown.map((o) => {
                const on = o === value;
                return (
                  <Pressable key={o} onPress={() => choose(o)}
                    style={{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: on ? colors.blue : 'transparent' }}>
                    <Text style={{ fontSize: 16, fontWeight: on ? '700' : '400', color: on ? '#fff' : colors.ink }}>{o}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={ui.row}>
              {!!value && (
                <Pressable style={[ui.btn, ui.outline, { flex: 1, height: 44 }]} onPress={() => choose('')}>
                  <Text style={[ui.btnText, { color: colors.ink }]}>Clear</Text>
                </Pressable>
              )}
              <Pressable style={[ui.btn, ui.outline, { flex: 1, height: 44 }]} onPress={() => setOpen(false)}>
                <Text style={[ui.btnText, { color: colors.ink }]}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
