import { Platform, Text } from 'react-native';
import { router, type Href } from 'expo-router';
import { colors } from '../lib/theme';

// "Terms of Service · Privacy Policy · Refund Policy" links, used on Home, Account and sign-up.
// The refund policy is only about merchants paying for plans (customers never pay Servly), so in the
// phone apps it shows only to merchants. The website always shows it: banks check the site's footer
// as a visitor before approving a merchant account.
export function LegalLinks({ prefix, refund = Platform.OS === 'web' }: { prefix?: string; refund?: boolean }) {
  const link = { color: colors.blue, fontWeight: '700' as const, textDecorationLine: 'underline' as const };
  return (
    <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 13, lineHeight: 20 }}>
      {prefix ? `${prefix} ` : ''}
      <Text style={link} onPress={() => router.push('/terms')}>Terms of Service</Text>
      {prefix ? (refund ? ', ' : ' and ') : ' · '}
      <Text style={link} onPress={() => router.push('/privacy')}>Privacy Policy</Text>
      {refund && (
        <>
          {prefix ? ' and ' : ' · '}
          <Text style={link} onPress={() => router.push('/refunds' as Href)}>Refund Policy</Text>
        </>
      )}
      {prefix ? '.' : ''}
    </Text>
  );
}
