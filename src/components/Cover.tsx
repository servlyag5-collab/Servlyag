import { Text, View, type DimensionValue } from 'react-native';
import { Image } from 'expo-image';
import { focusOf, position } from '../lib/focus';
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
// Pass a fixed `height`, or an `aspectRatio` (width / height) to keep the photo's shape at any width.
// `focus` is the listing's photo_focus: the part of the photo the merchant chose to show.
export function Cover({ photos, focus, title, width, height, aspectRatio, radius = 14 }: {
  photos?: string[] | null; focus?: unknown; title: string; width: DimensionValue; height?: number; aspectRatio?: number; radius?: number;
}) {
  const first = photos?.[0];
  if (first) return (
    <Image source={{ uri: photoUrl(first) }} contentFit="cover" contentPosition={position(focusOf(focus, first))} transition={150}
      style={{ width, height, aspectRatio, borderRadius: radius, backgroundColor: colors.field }} />
  );
  return (
    <View style={{ width, height, aspectRatio, borderRadius: radius, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: Math.round((height ?? 220) / 2.4) }}>{(title.trim()[0] ?? 'S').toUpperCase()}</Text>
    </View>
  );
}
