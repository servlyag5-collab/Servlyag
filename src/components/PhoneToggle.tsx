import { Switch, Text, View } from 'react-native';
import { colors, ui } from '../lib/theme';

// One switch per business: whether customers can see the business phone (Call button, business profile).
export function PhoneToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>Show my phone number to customers</Text>
        <Text style={[ui.muted, { fontSize: 14, lineHeight: 20 }]}>
          Turn this off to hide your number from your listings and business profile. Customers can still message you in the app.
        </Text>
      </View>
      {/* On: blue track with a gold dot. Off: grey track with a white dot. (activeThumbColor is the web's "on" dot colour.) */}
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.blue, false: colors.border }}
        thumbColor={value ? colors.gold : '#FFFFFF'} ios_backgroundColor={colors.border}
        {...({ activeThumbColor: colors.gold } as object)}
        accessibilityLabel="Show my phone number to customers" />
    </View>
  );
}
