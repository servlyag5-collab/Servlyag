import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatPrice } from '../lib/price';
import type { Rating } from '../lib/reviews';
import { colors } from '../lib/theme';
import { Cover } from './Cover';
import { RatingSummary } from './Stars';

export type CardListing = {
  id: string; merchant_id: string; title: string; photos: string[]; price: number | null; price_from: boolean;
  city: string; village: string | null; profiles: { display_name: string } | null;
};

const CARD_W = 240;
const GAP = 12;

// One listing card: cover on top, five-star rating, two-line title, business name, price bottom right.
function ListingCard({ s, rating }: { s: CardListing; rating?: Rating }) {
  const price = formatPrice(s.price, s.price_from);
  return (
    <Pressable onPress={() => router.push({ pathname: '/service/[id]', params: { id: s.id } })}
      style={{ width: CARD_W, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      <Cover photos={s.photos} title={s.title} width={CARD_W} height={150} radius={0} />
      <View style={{ padding: 12, gap: 6, flex: 1 }}>
        {/* Five stars and "4.0/5 · 12 reviews", shown only once the merchant has a review. */}
        <RatingSummary rating={rating} size={13} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, lineHeight: 22, minHeight: 44 }} numberOfLines={2}>{s.title}</Text>
        <Text style={{ fontSize: 13, color: colors.muted }} numberOfLines={1}>
          {s.profiles?.display_name || 'Servly merchant'} · {s.village || s.city}
        </Text>
        <Text style={{ alignSelf: 'flex-end', marginTop: 'auto', fontSize: 14, color: colors.muted }}>
          {s.price == null ? <Text style={{ fontWeight: '800', color: colors.blue }}>{price}</Text> : s.price_from
            ? <>From <Text style={{ fontSize: 19, fontWeight: '800', color: colors.blue }}>{price.replace('From ', '')}</Text></>
            : <Text style={{ fontSize: 19, fontWeight: '800', color: colors.blue }}>{price}</Text>}
        </Text>
      </View>
    </Pressable>
  );
}

// A heading and a row of cards you swipe left and right. On computers, ‹ › buttons scroll it too.
export function ListingRow({ title, rows, ratings }: { title: string; rows: CardListing[]; ratings: Record<string, Rating> }) {
  const sc = useRef<ScrollViewInstance>(null);
  const x = useRef(0);
  const [width, setWidth] = useState(0);
  // Move by as many whole cards as fit on screen, so a card edge always lines up on the left.
  const step = (dir: 1 | -1) => {
    const card = CARD_W + GAP;
    const perPage = Math.max(1, Math.floor(width / card));
    const at = Math.round(x.current / card);
    const max = Math.max(0, rows.length - perPage);
    x.current = Math.min(max, Math.max(0, at + dir * perPage)) * card;
    sc.current?.scrollTo({ x: x.current, animated: true });
  };
  return (
    <View style={{ gap: 10 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: colors.ink }}>{title}</Text>
        {Platform.OS === 'web' && rows.length > 1 && (
          <>
            <Pressable onPress={() => step(-1)} accessibilityLabel={`Scroll ${title} left`}
              style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-back" size={18} color={colors.ink} />
            </Pressable>
            <Pressable onPress={() => step(1)} accessibilityLabel={`Scroll ${title} right`}
              style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-forward" size={18} color={colors.ink} />
            </Pressable>
          </>
        )}
      </View>
      <ScrollView ref={sc} horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast"
        snapToInterval={CARD_W + GAP} snapToAlignment="start" contentContainerStyle={{ gap: GAP, paddingRight: 16 }}
        onScroll={(e) => { x.current = e.nativeEvent.contentOffset.x; }} scrollEventThrottle={32}>
        {rows.map((s) => <ListingCard key={s.id} s={s} rating={ratings[s.id]} />)}
      </ScrollView>
    </View>
  );
}
