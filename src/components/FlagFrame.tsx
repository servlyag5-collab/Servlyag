import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { colors, flag, ui } from '../lib/theme';

// A white card wrapped in the Antigua and Barbuda flag ribbon (see `flag` in theme.ts) with a soft blue glow.
// Used for the Home hero card and the highlighted plan. `badge` adds a gold label on the top edge.
export function FlagFrame({ children, badge }: { children: ReactNode; badge?: string }) {
  return (
    <View style={{ borderRadius: 26, boxShadow: '0px 8px 24px rgba(0, 114, 198, 0.18)', marginTop: badge ? 14 : 0 }}>
      <View style={{ borderRadius: 26, padding: 3, overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' }}>
          {flag.map((s, i) => <View key={i} style={{ flex: s.flex, backgroundColor: s.color }} />)}
        </View>
        <View style={[ui.card, { borderWidth: 0, borderRadius: 23 }, badge ? { paddingTop: 28 } : null]}>{children}</View>
      </View>
      {!!badge && (
        <View pointerEvents="none" style={{ position: 'absolute', top: -13, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.gold, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 2, borderColor: '#fff' }}>
            <Text style={{ color: colors.black, fontWeight: '800', letterSpacing: 1.5, fontSize: 12 }}>{badge}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
