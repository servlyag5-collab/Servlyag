import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

export type PayStatus = 'paid' | 'pending' | 'declined' | 'cancelled' | 'error';

const TEXT: Record<PayStatus, { title: string; body: string; color: string }> = {
  paid: { title: 'Payment received', body: 'Thank you! Your plan is on and your listings are live. Your receipt is on your Account page.', color: colors.blue },
  pending: { title: 'Checking your payment', body: 'The bank is still confirming your payment. This message updates by itself.', color: colors.gold },
  declined: { title: "The payment didn't go through", body: 'Your card was not charged. Choose your plan again to try another card.', color: colors.red },
  cancelled: { title: 'Payment cancelled', body: 'You cancelled the payment. Nothing was charged. Choose a plan below whenever you are ready.', color: colors.muted },
  error: { title: 'Something went wrong', body: "We couldn't confirm this payment. If money was taken from your card, contact support and we'll sort it out.", color: colors.red },
};

const asStatus = (s?: string): PayStatus => (s && s in TEXT ? (s as PayStatus) : 'error');

// Shown at the top of the Plan screen when the merchant comes back from the card payment page
// (payment-return sends them to /plan?payment=<status>&order=<id>). The order itself is checked too,
// and re-checked while the bank is still confirming. onPaid lets the Plan screen reload the plan.
export function PaymentNotice({ status, order, onPaid }: { status?: string; order?: string; onPaid?: () => void }) {
  const [s, setS] = useState<PayStatus>(asStatus(status));

  useEffect(() => {
    setS(asStatus(status));
    if (!order) return;
    let stop = false, tries = 0;
    const check = async () => {
      const { data } = await supabase.from('payment_orders').select('status').eq('id', order).maybeSingle();
      if (stop) return;
      const now = data?.status ? asStatus(data.status as string) : asStatus(status);
      setS(now);
      if (now === 'paid') onPaid?.();
      if (now === 'pending' && ++tries < 20) setTimeout(check, 3000);
    };
    check();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, order]);

  if (!status) return null;
  const t = TEXT[s];
  return (
    <View style={[ui.card, { borderColor: t.color, borderWidth: 2, gap: 8 }]} accessibilityLiveRegion="polite">
      <Text style={ui.h2}>{t.title}</Text>
      <Text style={ui.muted}>{t.body}</Text>
      {s === 'error' && (
        <Pressable style={[ui.btn, ui.outline]} onPress={() => router.push('/support' as Href)}>
          <Text style={[ui.btnText, { color: colors.ink }]}>Contact support</Text>
        </Pressable>
      )}
      <Text style={[ui.muted, { fontSize: 14 }]}>Paid from the Servly app? You can close this page and go back to the app.</Text>
    </View>
  );
}
