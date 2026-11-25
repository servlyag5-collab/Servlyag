import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cover } from '../../components/Cover';
import { TopBar } from '../../components/Menu';
import { Reviews } from '../../components/Reviews';
import { callBusiness } from '../../lib/calls';
import { formatPrice } from '../../lib/price';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, ui } from '../../lib/theme';
import { PinLoader } from '../../components/PinLoader';
import { FOUNDERS_PREVIEW, PREVIEW_NOTICE } from '../../lib/preview';

type P = { display_name: string; bio: string; public_phone: string | null };
type Svc = { id: string; title: string; photos: string[]; photo_focus: unknown; price: number | null; price_from: boolean; city: string; village: string | null; listed_as?: string | null };

export default function Business() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const [p, setP] = useState<P | null>(null);
  const [rows, setRows] = useState<Svc[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('display_name,bio,public_phone').eq('id', id).single().then(({ data }) => setP(data as P));
    supabase.from('services').select('id,title,photos,photo_focus,price,price_from,city,village,listed_as').eq('merchant_id', id).eq('active', true).eq('paused', false)
      .order('created_at', { ascending: false }).then(({ data }) => setRows((data as Svc[]) ?? []));
  }, [id]);

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        {!p ? <PinLoader /> : (
          <>
            <Text style={ui.h1}>{p.display_name || 'Servly merchant'}</Text>
            {!!p.bio && <Text style={ui.muted}>{p.bio}</Text>}
            {/* Founders website (preview): no Call yet, a notice instead. */}
            {FOUNDERS_PREVIEW && <Text style={[ui.muted, { fontWeight: '700' }]}>{PREVIEW_NOTICE}</Text>}
            {!!p.public_phone && !FOUNDERS_PREVIEW && (
              <Pressable style={[ui.btn, ui.primary]} onPress={() => callBusiness(p.public_phone!, id, null, session?.user.id)}>
                <Text style={[ui.btnText, { color: '#fff' }]}>Call {p.public_phone}</Text>
              </Pressable>
            )}
            <Text style={[ui.h2, { marginTop: 12 }]}>Services</Text>
            {rows.map((s) => (
              <Pressable key={s.id} style={[ui.card, { flexDirection: 'row', gap: 14, padding: 14, alignItems: 'center' }]} onPress={() => router.push({ pathname: '/service/[id]', params: { id: s.id } })}>
                <Cover photos={s.photos} focus={s.photo_focus} title={s.title} width={72} height={72} radius={12} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{s.title}</Text>
                  {!!s.listed_as?.trim() && <Text style={{ fontSize: 14, fontWeight: '700', color: colors.blue }}>Listed as {s.listed_as.trim()}</Text>}
                  <Text style={ui.muted}>{s.village ? `${s.village}, ` : ''}{s.city} · {formatPrice(s.price, s.price_from)}</Text>
                </View>
              </Pressable>
            ))}
            {rows.length === 0 && <View><Text style={ui.muted}>No services listed yet.</Text></View>}
            <Reviews merchantId={id} limit={5} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
