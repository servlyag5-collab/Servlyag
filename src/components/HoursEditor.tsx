import { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { DAYS, TIMES, timeLabel, type DayKey, type Hours } from '../lib/hours';
import { colors, ui } from '../lib/theme';

// "Show opening hours" switch + weekly table, on Offer a service and Edit listing.
// Switching it off keeps the hours, just hidden from customers.
export function HoursEditor({ show, onShow, hours, onChange }: {
  show: boolean; onShow: (v: boolean) => void; hours: Hours; onChange: (h: Hours) => void;
}) {
  const [picking, setPicking] = useState<{ day: DayKey; end: 'from' | 'to' } | null>(null);
  const setDay = (day: DayKey, patch: Partial<Hours[DayKey]>) => onChange({ ...hours, [day]: { ...hours[day], ...patch } });
  const copyMonday = () => onChange({ ...hours, tue: { ...hours.mon }, wed: { ...hours.mon }, thu: { ...hours.mon }, fri: { ...hours.mon } });

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>Show opening hours</Text>
          <Text style={[ui.muted, { fontSize: 14, lineHeight: 20 }]}>
            Turn this on if your business keeps regular hours. Customers see them on your listing, with "Open now" or "Closed now".
          </Text>
        </View>
        <Switch value={show} onValueChange={onShow} trackColor={{ true: colors.blue, false: colors.border }}
          thumbColor={show ? colors.gold : '#FFFFFF'} ios_backgroundColor={colors.border}
          {...({ activeThumbColor: colors.gold } as object)} accessibilityLabel="Show opening hours" />
      </View>

      {show && (
        <View style={[ui.card, { padding: 12, gap: 6 }]}>
          {DAYS.map((d) => {
            const h = hours[d.key];
            return (
              <View key={d.key} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ width: 40, fontWeight: '800', color: colors.ink }}>{d.short}</Text>
                  <Pressable onPress={() => setDay(d.key, { open: !h.open })} accessibilityLabel={`${d.long}: ${h.open ? 'open' : 'closed'}`}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1,
                      borderColor: h.open ? colors.blue : colors.border, backgroundColor: h.open ? colors.blue : '#fff' }}>
                    <Text style={{ fontWeight: '700', fontSize: 13, color: h.open ? '#fff' : colors.muted }}>{h.open ? 'Open' : 'Closed'}</Text>
                  </Pressable>
                  {h.open && (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <TimeButton label={timeLabel(h.from)} onPress={() => setPicking({ day: d.key, end: 'from' })} />
                      <Text style={{ color: colors.muted }}>to</Text>
                      <TimeButton label={timeLabel(h.to, true)} onPress={() => setPicking({ day: d.key, end: 'to' })} />
                    </View>
                  )}
                </View>
                {d.key === 'mon' && (
                  <Pressable onPress={copyMonday} style={{ alignSelf: 'flex-start', marginLeft: 48 }}>
                    <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 13 }}>Copy Monday to Tue–Fri</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          <Text style={[ui.muted, { fontSize: 13, lineHeight: 18 }]}>Times are Antigua time. Closing earlier than opening means after midnight.</Text>
        </View>
      )}

      <Modal visible={!!picking} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,33,43,0.35)', justifyContent: 'center', padding: 16 }} onPress={() => setPicking(null)}>
          <Pressable style={[ui.card, { width: '100%', maxWidth: 360, maxHeight: '75%', alignSelf: 'center', padding: 12 }]}>
            {picking && (
              <>
                <Text style={[ui.h2, { fontSize: 18, paddingHorizontal: 8 }]}>
                  {DAYS.find((d) => d.key === picking.day)!.long}: {picking.end === 'from' ? 'opens at' : 'closes at'}
                </Text>
                <ScrollView contentContainerStyle={{ gap: 4, paddingVertical: 8 }}>
                  {TIMES.map((t) => {
                    const on = hours[picking.day][picking.end] === t;
                    return (
                      <Pressable key={t} onPress={() => { setDay(picking.day, { [picking.end]: t }); setPicking(null); }}
                        style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: on ? colors.blue : 'transparent' }}>
                        <Text style={{ fontWeight: '700', color: on ? '#fff' : colors.ink }}>{timeLabel(t, picking.end === 'to')}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function TimeButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.field }}>
      <Text style={{ fontWeight: '700', color: colors.ink, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
