import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../components/Menu';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type N = { id: string; body: string; created_at: string; services: { id: string; title: string } | null };

// Customer view: the notes I sent to merchants. (Merchants' received notes are in inbox.tsx.)
export default function Messages() {
  const session = useSession();
  const uid = session?.user.id;
  const [rows, setRows] = useState<N[] | null>(null);

  useFocusEffect(useCallback(() => {
    if (!uid) return;
    supabase.from('notes').select('id,body,created_at,services(id,title)')
      .eq('customer_id', uid).order('created_at', { ascending: false })
      .then(({ data }) => setRows((data as unknown as N[]) ?? []));
  }, [uid]));

  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        <Text style={ui.h1}>Messages</Text>
        <Text style={ui.muted}>Notes you sent to merchants. They reply by phone or WhatsApp.</Text>
        {!rows && <ActivityIndicator color={colors.blue} />}
        {rows?.length === 0 && <Text style={ui.muted}>No notes yet. Open a listing and send a note to get started.</Text>}
        {rows?.map((n) => (
          <Pressable key={n.id} style={ui.card} disabled={!n.services}
            onPress={() => n.services && router.push({ pathname: '/service/[id]', params: { id: n.services.id } })}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{new Date(n.created_at).toLocaleString()}</Text>
            <Text style={{ fontWeight: '800', fontSize: 18, color: colors.ink }}>{n.services?.title ?? 'Listing no longer available'}</Text>
            <Text style={ui.muted}>{n.body}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
