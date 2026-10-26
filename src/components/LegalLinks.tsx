import { Text } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../lib/theme';

// "Privacy Policy · Terms of Service" links, used on Home, Account and sign-up.
export function LegalLinks({ prefix }: { prefix?: string }) {
  const link = { color: colors.blue, fontWeight: '700' as const, textDecorationLine: 'underline' as const };
  return (
    <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 13, lineHeight: 20 }}>
      {prefix ? `${prefix} ` : ''}
      <Text style={link} onPress={() => router.push('/terms')}>Terms of Service</Text>
      {prefix ? ' and ' : ' · '}
      <Text style={link} onPress={() => router.push('/privacy')}>Privacy Policy</Text>
      {prefix ? '.' : ''}
    </Text>
  );
}
