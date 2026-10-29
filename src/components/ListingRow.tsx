import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { normalizeHours, openStatus, useNow } from '../lib/hours';
import { formatPrice } from '../lib/price';
import type { Rating } from '../lib/reviews';
import { colors, fonts } from '../lib/theme';
import { Cover } from './Cover';
import { RatingSummary } from './Stars';

export type CardListing = {
  id: string; merchant_id: string; title: string; photos: string[]; photo_focus?: unknown; price: number | null; price_from: boolean;
  city: string; village: string | null; profiles: { display_name: string } | null;
  show_hours?: boolean; hours?: unknown;
};

export const CARD_W = 240; // listing card width (Home rows)
export const GAP = 12;     // space between cards

// One listing card: cover on top, five-star rating, two-line title, business name, price bottom right.
function ListingCard({ s, rating, now, width = CARD_W }: { s: CardListing; rating?: Rating; now: Date; width?: number }) {
  const price = formatPrice(s.price, s.price_from);
  const open = !!s.show_hours && openStatus(normalizeHours(s.hours), now).open;
  return (
    <Pressable onPress={() => router.push({ pathname: '/service/[id]', params: { id: s.id } })}
      style={{ width, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      <Cover photos={s.photos} focus={s.photo_focus} title={s.title} width={width} height={Math.round(width / 1.6)} radius={0} />
      <View style={{ padding: 12, gap: 6, flex: 1 }}>
        {/* Five stars and "4.0/5 · 12 reviews", shown only once the merchant has a review. The space is kept
            either way, so every card is the same height and stacked cards line up across columns. */}
        <View style={{ minHeight: 17, justifyContent: 'center' }}><RatingSummary rating={rating} size={13} /></View>
        <Text style={{ fontSize: 17, fontFamily: fonts.semi, color: colors.ink, lineHeight: 22, minHeight: 44 }} numberOfLines={2}>{s.title}</Text>
        <Text style={{ fontSize: 13, color: colors.muted }} numberOfLines={1}>
          {s.profiles?.display_name || 'Servly merchant'} · {s.village || s.city}
        </Text>
        {/* Bottom line: a small "Open" on the left (only while the listing shows hours and is open now), price on the right. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 'auto' }}>
          {open && (
            // A small gold tag with dark text (gold text on white would be too faint to read).
            <View style={{ backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.ink }}>Open</Text>
            </View>
          )}
          <Text style={{ marginLeft: 'auto', fontSize: 14, color: colors.muted }}>
            {s.price == null ? <Text style={{ fontWeight: '800', color: colors.blue }}>{price}</Text> : s.price_from
              ? <>From <Text style={{ fontSize: 19, fontWeight: '800', color: colors.blue }}>{price.replace('From ', '')}</Text></>
              : <Text style={{ fontSize: 19, fontWeight: '800', color: colors.blue }}>{price}</Text>}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// A heading and cards you swipe left and right. On computers, ‹ › buttons scroll it too.
// `layers` = how many cards are stacked in each column. Cards fill each column top to bottom, then the
// next column, so in their order (Business first, then Growth, then Starter) they run down, then across.
export function ListingRow({ title, rows, ratings, layers = 1 }: { title: string; rows: CardListing[]; ratings: Record<string, Rating>; layers?: number }) {
  const sc = useRef<ScrollViewInstance>(null);
  const x = useRef(0);
  const [width, setWidth] = useState(0);
  const now = useNow(); // re-checks "Open" every minute while Home stays open
  // Move by as many whole cards as fit on screen, so a card edge always lines up on the left.
  const step = (dir: 1 | -1) => {
    const card = CARD_W + GAP;
    const perPage = Math.max(1, Math.floor(width / card));
    const at = Math.round(x.current / card);
    const max = Math.max(0, Math.ceil(rows.length / layers) - perPage);
    x.current = Math.min(max, Math.max(0, at + dir * perPage)) * card;
    sc.current?.scrollTo({ x: x.current, animated: true });
  };
  return (
    <View style={{ gap: 10 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 21, fontFamily: fonts.title, color: colors.ink, letterSpacing: -0.3 }}>{title}</Text>
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
        {Array.from({ length: Math.ceil(rows.length / layers) }, (_, c) => (
          <View key={c} style={{ gap: GAP }}>
            {rows.slice(c * layers, c * layers + layers).map((s) => <ListingCard key={s.id} s={s} rating={ratings[s.id]} now={now} />)}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

