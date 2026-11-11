import { useCallback, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type Info = {
  auto_pay: boolean; card_type: string | null; card_last4: string | null; card_expiry: string | null;
  next_charge_at: string | null; next_amount: number | null; failing: boolean; retry_until: string | null;
};

// CyberSource card type codes (Secure Acceptance req_card_type).
const CARD: Record<string, string> = { '001': 'Visa', '002': 'Mastercard', '003': 'American Express', '004': 'Discover' };
export const cardName = (code: string | null) => (code && CARD[code]) || 'Card';
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

// Account > Your plan: the saved card and "Pay automatically each month" (database v33). Shows nothing
// until a card has been saved by a payment.
export function AutoPay({ active }: { active: boolean }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState('');

  useFocusEffect(useCallback(() => {
    supabase.rpc('my_auto_pay').maybeSingle().then(({ data }) => setInfo((data as Info | null) ?? null));
  }, []));

  if (!info?.card_last4 && !info?.card_type) return null;

  async function toggle(on: boolean) {
    setErr('');
    setInfo((i) => (i ? { ...i, auto_pay: on } : i));
    const { error } = await supabase.rpc('set_auto_pay', { p_on: on });
    if (error) { setErr(error.message); setInfo((i) => (i ? { ...i, auto_pay: !on } : i)); }
  }

  const card = `${cardName(info.card_type)}${info.card_last4 ? ` ending ${info.card_last4}` : ''}`;
  return (
    <View style={{ gap: 8, borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>Pay automatically each month</Text>
          <Text style={[ui.muted, { fontSize: 14, lineHeight: 20 }]}>
            {info.auto_pay
              ? `${card}${active && info.next_charge_at && info.next_amount ? `. Next payment: ${Number(info.next_amount).toFixed(2)} XCD on ${day(info.next_charge_at)}.` : '.'}`
              : `Off. Your plan ends on its end date unless you pay on the Plan screen. ${card} stays saved for when you turn this back on.`}
          </Text>
        </View>
        <Switch value={info.auto_pay} onValueChange={toggle} trackColor={{ true: colors.blue, false: colors.border }}
          thumbColor={info.auto_pay ? colors.gold : '#FFFFFF'} ios_backgroundColor={colors.border}
          {...({ activeThumbColor: colors.gold } as object)}
          accessibilityLabel="Pay automatically each month" />
      </View>
      {info.failing && info.retry_until && (
        <Text style={{ color: colors.red, fontSize: 14, lineHeight: 20, fontWeight: '700' }}>
          Your last automatic payment didn't go through. We'll try again each day until {day(info.retry_until)}, and your listings stay visible until then. To pay now, tap See plans.
        </Text>
      )}
      {!!err && <Text style={ui.error}>{err}</Text>}
    </View>
  );
}
