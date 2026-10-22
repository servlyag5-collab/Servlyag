import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, ui } from '../../lib/theme';

type P = { display_name: string; bio: string; phone: string | null };
type Svc = { id: string; title: string; price: number | null; city: string; village: string | null };

export default function Business() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<P | null>(null);
  const [rows, setRows] = useState<Svc[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('display_name,bio,phone').eq('id', id).single().then(({ data }) => setP(data as P));
    supabase.from('services').select('id,title,price,city,village').eq('merchant_id', id).eq('active', true)
      .order('created_at', { ascending: false }).then(({ data }) => setRows((data as Svc[]) ?? []));
  }, [id]);

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>← Back</Text></Pressable>
        {!p ? <ActivityIndicator color={colors.blue} /> : (
          <>
            <Text style={ui.h1}>{p.display_name || 'Servly merchant'}</Text>
            {!!p.bio && <Text style={ui.muted}>{p.bio}</Text>}
            {!!p.phone && (
              <Pressable style={[ui.btn, ui.primary]} onPress={() => Linking.openURL(`tel:${p.phone}`)}>
                <Text style={[ui.btnText, { color: '#fff' }]}>Call {p.phone}</Text>
              </Pressable>
            )}
            <Text style={[ui.h2, { marginTop: 12 }]}>Services</Text>
            {rows.map((s) => (
              <Pressable key={s.id} style={ui.card} onPress={() => router.push({ pathname: '/service/[id]', params: { id: s.id } })}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{s.title}</Text>
                <Text style={ui.muted}>{s.village ? `${s.village}, ` : ''}{s.city} · {s.price != null ? `EC$${s.price}` : 'Ask for price'}</Text>
              </Pressable>
            ))}
            {rows.length === 0 && <View><Text style={ui.muted}>No services listed yet.</Text></View>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
