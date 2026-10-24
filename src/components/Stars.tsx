import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Rating } from '../lib/reviews';
import { colors } from '../lib/theme';

// Gold stars. Shows a rating (halves too), or lets someone tap 1-5 when onChange is given.
export function Stars({ value, size = 16, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: size >= 28 ? 8 : 2 }} accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name = value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline';
        // Filled stars use the flag gold; empty outlines a deeper gold so they stay visible on white.
        const icon = <Ionicons name={name} size={size} color={name === 'star-outline' ? '#C99A00' : colors.gold} />;
        return onChange
          ? <Pressable key={i} onPress={() => onChange(i)} hitSlop={4} accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}>{icon}</Pressable>
          : <View key={i}>{icon}</View>;
      })}
    </View>
  );
}

// "★★★★½ 4.6/5 · 12 reviews". Shows nothing until a merchant has a review, unless showEmpty
// (then empty stars and "No reviews yet", so every card lines up the same).
export function RatingSummary({ rating, size = 14, showEmpty = false }: { rating?: Rating; size?: number; showEmpty?: boolean }) {
  const total = rating?.total ?? 0;
  if (!total && !showEmpty) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <Stars value={rating?.average ?? 0} size={size} />
      {total > 0 ? (
        <Text style={{ fontSize: size, color: colors.muted }}>
          <Text style={{ fontWeight: '800', color: colors.ink }}>{rating!.average.toFixed(1)}/5</Text>
          {` · ${total} review${total === 1 ? '' : 's'}`}
        </Text>
      ) : (
        <Text style={{ fontSize: size, color: colors.muted }}>No reviews yet</Text>
      )}
    </View>
  );
}
