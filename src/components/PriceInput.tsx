import { Pressable, Text, TextInput, View } from 'react-native';
import { formatPrice } from '../lib/price';
import { colors, ui } from '../lib/theme';

// The price box on Offer a service and Edit listing, with a "From" switch inside it on the left.
// From on = starting price ("From EC$500"); off = fixed price ("EC$30").
export function PriceInput({ value, onChange, from, onFromChange }: {
  value: string; onChange: (v: string) => void; from: boolean; onFromChange: (v: boolean) => void;
}) {
  const n = value.trim() && !isNaN(Number(value)) ? Number(value) : null;
  return (
    <View style={{ gap: 6 }}>
      <View style={[ui.field, { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6 }]}>
        <Pressable onPress={() => onFromChange(!from)} accessibilityRole="switch" accessibilityState={{ checked: from }}
          accessibilityLabel="Starting price (From)"
          style={{ height: 38, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center', borderWidth: 1,
            backgroundColor: from ? colors.blue : '#fff', borderColor: from ? colors.blue : colors.border }}>
          <Text style={{ fontWeight: '800', color: from ? '#fff' : colors.muted }}>From</Text>
        </Pressable>
        <Text style={{ fontSize: 16, color: colors.muted }}>EC$</Text>
        <TextInput style={{ flex: 1, fontSize: 16, color: colors.ink, alignSelf: 'stretch' }} placeholder="Price (optional)"
          placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={value} onChangeText={onChange} />
      </View>
      <Text style={[ui.muted, { fontSize: 14, lineHeight: 20 }]}>
        {n != null ? `Customers will see "${formatPrice(n, from)}". ` : ''}
        {from ? 'Use From for a starting price; give customers the full breakdown when they call or message.' : 'Tap From if this is a starting price with add-ons or bigger packages.'}
      </Text>
    </View>
  );
}
