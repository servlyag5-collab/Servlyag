import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type N = { id: string; body: string; contact: string; created_at: string; read_at: string | null; profiles: { display_name: string } | null; services: { title: string } | null };
// 7-digit local numbers get the Antigua and Barbuda code (1-268).
const digits = (c: string) => { const d = c.replace(/\D/g, ''); return d.length === 7 ? `1268${d}` : d; };

export default function Inbox() {
  const [rows, setRows] = useState<N[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('notes')
        .select('id,body,contact,created_at,read_at,profiles(display_name),services!inner(title,merchant_id)')
        .eq('services.merchant_id', user!.id).order('created_at', { ascending: false });
      const list = (data as unknown as N[]) ?? [];
      setRows(list);
      const ids = list.filter((n) => !n.read_at).map((n) => n.id);
      if (ids.length) await supabase.from('notes').update({ read_at: new Date().toISOString() }).in('id', ids);
    })();
  }, []);

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>← Back</Text></Pressable>
        <Text style={ui.h1}>Inbox</Text>
        {!rows && <ActivityIndicator color={colors.blue} />}
        {rows?.length === 0 && <Text style={ui.muted}>No notes yet. When a customer writes to you about a service, it shows up here.</Text>}
        {rows?.map((n) => (
          <View key={n.id} style={[ui.card, !n.read_at && { borderColor: colors.blue, borderWidth: 2 }]}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{n.services?.title} · {new Date(n.created_at).toLocaleString()}</Text>
            <Text style={{ fontWeight: '800', fontSize: 18, color: colors.ink }}>{n.profiles?.display_name || 'Customer'}</Text>
            <Text style={ui.muted}>{n.body}</Text>
            <View style={ui.row}>
              <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={() => Linking.openURL(`tel:+${digits(n.contact)}`)}><Text style={[ui.btnText, { color: colors.ink }]}>Call {n.contact}</Text></Pressable>
              <Pressable style={[ui.btn, ui.primary, { flex: 1 }]} onPress={() => Linking.openURL(`https://wa.me/${digits(n.contact)}`)}><Text style={[ui.btnText, { color: '#fff' }]}>WhatsApp</Text></Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
