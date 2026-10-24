import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { antigua, clock, MONTHS } from '../lib/bookings';
import { colors } from '../lib/theme';

export type Pick = { y: number; m: number; d: number; h: number; min: number } | null;

// Bookable times: 7:00 AM to 8:00 PM, every 30 minutes (Antigua time).
const SLOTS = Array.from({ length: 27 }, (_, i) => ({ h: 7 + Math.floor(i / 2), min: (i % 2) * 30 }));
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Servly-styled calendar + time slots. Past days and times are greyed out.
export function DateTimePicker({ value, onChange }: { value: Pick; onChange: (v: Pick) => void }) {
  const now = antigua(new Date());
  const [view, setView] = useState({ y: value?.y ?? now.y, m: value?.m ?? now.m });
  const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const key = (y: number, m: number, d: number) => y * 10000 + m * 100 + d;
  const today = key(now.y, now.m, now.d);
  const canGoBack = key(view.y, view.m, 1) > key(now.y, now.m, 1);
  const move = (dir: 1 | -1) => setView((v) => { const t = new Date(Date.UTC(v.y, v.m + dir, 1)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() }; });
  const pickedDay = value ? key(value.y, value.m, value.d) : null;
  const slotGone = (h: number, min: number) => pickedDay === today && h * 60 + min <= now.h * 60 + now.min;

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => canGoBack && move(-1)} disabled={!canGoBack} hitSlop={8} accessibilityLabel="Previous month"
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', opacity: canGoBack ? 1 : 0.3 }}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.ink }}>{MONTHS[view.m]} {view.y}</Text>
        <Pressable onPress={() => move(1)} hitSlop={8} accessibilityLabel="Next month"
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-forward" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {WEEK.map((w, i) => <Text key={i} style={{ width: `${100 / 7}%`, textAlign: 'center', color: colors.muted, fontWeight: '700', fontSize: 13, paddingBottom: 6 }}>{w}</Text>)}
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 44 }} />;
          const k = key(view.y, view.m, d);
          const past = k < today;
          const on = k === pickedDay;
          return (
            <View key={k} style={{ width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable disabled={past} onPress={() => onChange({ y: view.y, m: view.m, d, h: value?.h ?? -1, min: value?.min ?? 0 })}
                accessibilityLabel={`${d} ${MONTHS[view.m]}`}
                style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: on ? colors.blue : 'transparent', borderWidth: k === today && !on ? 2 : 0, borderColor: colors.gold }}>
                <Text style={{ fontSize: 15, fontWeight: on ? '800' : '600', color: on ? '#fff' : past ? colors.border : colors.ink }}>{d}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {value && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>Time (Antigua)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SLOTS.map(({ h, min }) => {
              const gone = slotGone(h, min);
              const on = value.h === h && value.min === min;
              return (
                <Pressable key={`${h}:${min}`} disabled={gone} onPress={() => onChange({ ...value, h, min })}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1,
                    borderColor: on ? colors.blue : colors.border, backgroundColor: on ? colors.blue : '#fff', opacity: gone ? 0.35 : 1 }}>
                  <Text style={{ fontWeight: '700', color: on ? '#fff' : colors.ink }}>{clock(h, min)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
