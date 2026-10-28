import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DAYS, normalizeHours, openStatus, timeLabel, todayKey, useNow } from '../lib/hours';
import { colors, ui } from '../lib/theme';

// A listing's opening hours with a live "Open now / Closed now" line (Antigua time). Today is in bold.
export function HoursCard({ hours: raw }: { hours: unknown }) {
  const hours = normalizeHours(raw);
  const now = useNow();
  const status = openStatus(hours, now);
  const [state, next] = status.label.split(' · '); // "Open now" + "closes at 5:00 PM"
  const today = todayKey(now);
  return (
    <View style={[ui.card, { gap: 8 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="time-outline" size={20} color={colors.blue} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>Opening hours</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: status.open ? colors.blue : colors.red }} />
        {/* Open: "Open now" blue, closing time red. Closed: "Closed now" red, opening time grey. */}
        <Text style={{ fontWeight: '700', color: status.open ? colors.blue : colors.red }}>
          {state}{!!next && <>{' · '}<Text style={{ color: status.open ? colors.red : colors.muted }}>{next}</Text></>}
        </Text>
      </View>
      {DAYS.map((d) => {
        const h = hours[d.key];
        const isToday = d.key === today;
        return (
          <View key={d.key} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.ink, fontWeight: isToday ? '800' : '400' }}>{d.long}{isToday ? ' (today)' : ''}</Text>
            <Text style={{ color: h.open ? colors.ink : colors.muted, fontWeight: isToday ? '800' : '400' }}>
              {h.open ? `${timeLabel(h.from)} – ${timeLabel(h.to, true)}` : 'Closed'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
