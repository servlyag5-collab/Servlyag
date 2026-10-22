import { Image, Text, View, type DimensionValue } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

export const photoUrl = (path: string) => supabase.storage.from('service-photos').getPublicUrl(path).data.publicUrl;

// The small "Cover" label on the first photo in the Offer and Edit photo pickers.
export function CoverTag() {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.blue, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, paddingVertical: 2 }}>
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center' }}>Cover</Text>
    </View>
  );
}

// A listing's cover: its first photo (logo or best photo), or a blue square with the first letter.
export function Cover({ photos, title, width, height, radius = 14 }: { photos?: string[] | null; title: string; width: DimensionValue; height: number; radius?: number }) {
  const first = photos?.[0];
  if (first) return <Image source={{ uri: photoUrl(first) }} style={{ width, height, borderRadius: radius, backgroundColor: colors.field }} resizeMode="cover" />;
  return (
    <View style={{ width, height, borderRadius: radius, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: Math.round(height / 2.4) }}>{(title.trim()[0] ?? 'S').toUpperCase()}</Text>
    </View>
  );
}
