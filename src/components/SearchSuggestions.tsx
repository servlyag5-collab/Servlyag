import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

export type Suggestion = { kind: 'business' | 'service'; label: string; merchant_id: string | null; service_id: string | null };
const WAIT = 250; // milliseconds after the last key press

// The list under the Home search box while typing, like big service apps (v30 search_suggestions):
// up to 3 businesses (tap = open that business straight away) and up to 3 services (tap = search for it).
export function SearchSuggestions({ q, show, onSearch }: { q: string; show: boolean; onSearch: (text: string) => void }) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const text = q.trim();

  useEffect(() => {
    if (text.length < 2) { setItems([]); return; }
    let alive = true;
    const t = setTimeout(() => {
      supabase.rpc('search_suggestions', { p_q: text }).then(({ data }) => { if (alive) setItems((data as Suggestion[]) ?? []); });
    }, WAIT);
    return () => { alive = false; clearTimeout(t); };
  }, [text]);

  if (!show || text.length < 2 || items.length === 0) return null;
  const businesses = items.filter((i) => i.kind === 'business');
  const services = items.filter((i) => i.kind === 'service');

  const open = (s: Suggestion) => {
    if (s.service_id) router.push({ pathname: '/service/[id]', params: { id: s.service_id } });
    else if (s.merchant_id) router.push({ pathname: '/business/[id]', params: { id: s.merchant_id } });
  };
  const row = (s: Suggestion, icon: 'storefront-outline' | 'search', onPress: () => void) => (
    <Pressable key={s.kind + s.label + (s.merchant_id ?? '')} onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: pressed ? colors.field : 'transparent' })}>
      <Ionicons name={icon} size={19} color={colors.blue} />
      <Text style={{ flex: 1, fontSize: 16, color: colors.ink }} numberOfLines={1}>{s.label}</Text>
      {s.kind === 'business' && <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
    </Pressable>
  );
  const heading = (t: string) => <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, paddingHorizontal: 14, paddingTop: 10 }}>{t}</Text>;

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, paddingBottom: 6, boxShadow: '0px 10px 28px rgba(0, 0, 0, 0.18)' }}
      accessibilityLabel="Search suggestions">
      {businesses.length > 0 && heading('Businesses')}
      {businesses.map((s) => row(s, 'storefront-outline', () => open(s)))}
      {services.length > 0 && heading('Services')}
      {services.map((s) => row(s, 'search', () => onSearch(s.label)))}
    </View>
  );
}
