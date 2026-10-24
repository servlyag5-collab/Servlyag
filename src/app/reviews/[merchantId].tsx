import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '../../components/Menu';
import { Reviews } from '../../components/Reviews';
import { supabase } from '../../lib/supabase';
import { colors, ui } from '../../lib/theme';

// Every review of one merchant. Open to everyone, guests included.
export default function AllReviews() {
  const { merchantId } = useLocalSearchParams<{ merchantId: string }>();
  const [name, setName] = useState('');
  useEffect(() => {
    supabase.from('profiles').select('display_name').eq('id', merchantId).maybeSingle().then(({ data }) => setName(data?.display_name ?? ''));
  }, [merchantId]);
  return (
    <SafeAreaView style={ui.screen}>
      <ScrollView contentContainerStyle={ui.page}>
        <TopBar />
        {!!name && <Text style={{ fontSize: 18, fontWeight: '700', color: colors.blue }}>{name}</Text>}
        <Reviews merchantId={merchantId} />
      </ScrollView>
    </SafeAreaView>
  );
}
