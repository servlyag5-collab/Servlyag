import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { colors, flag, fonts, WIDE } from '../lib/theme';

// Computers: the page content on the left, a side panel on the right (by default the Servly panel:
// harbour blue with the flag's gold sun, like the Home hero). Phones: just the content, as before.
export function WideSplit({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  if (!WIDE) return <>{children}</>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 40 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 14 }}>{children}</View>
      <View style={{ width: 400, gap: 16 }}>{aside ?? <ServlyPanel />}</View>
    </View>
  );
}

// The Servly side panel shown next to forms and account pages on computers.
export function ServlyPanel() {
  const points = [
    'Local businesses across Antigua and Barbuda',
    'Message or call them directly',
    'Reviews from real customers',
  ];
  return (
    <View style={{ backgroundColor: colors.harbour, borderRadius: 24, overflow: 'hidden', boxShadow: '0px 14px 32px rgba(11, 58, 99, 0.22)' }}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -50, top: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(252, 209, 22, 0.16)' }} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -22, top: -22, width: 104, height: 104, borderRadius: 52, backgroundColor: colors.gold }} />
      <View style={{ padding: 26, paddingTop: 34, gap: 16 }}>
        <Text style={{ fontFamily: fonts.heading, fontSize: 28, lineHeight: 31, color: '#fff', letterSpacing: -0.6, maxWidth: 270 }}>
          Whatever you need, someone's ready.
        </Text>
        <View style={{ gap: 10 }}>
          {points.map((p) => (
            <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />
              <Text style={{ color: '#CFE3F5', fontSize: 15, lineHeight: 21, flex: 1 }}>{p}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', height: 6 }}>
        {flag.map((st, i) => <View key={i} style={{ flex: st.flex, backgroundColor: st.color }} />)}
      </View>
    </View>
  );
}
