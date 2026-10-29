import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

// Full-screen photos on a listing: the whole photo (never cropped), swipe left/right between them
// (‹ › buttons and arrow keys on the website), × to close. `start` is the photo tapped; null = closed.
export function PhotoViewer({ urls, start, onClose }: { urls: string[]; start: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const scroller = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const open = start !== null;

  const go = (i: number, animated = true) => {
    const to = Math.min(urls.length - 1, Math.max(0, i));
    setIndex(to);
    scroller.current?.scrollTo({ x: to * width, animated });
  };

  // Open on the photo that was tapped.
  useEffect(() => {
    if (start === null) return;
    setIndex(start);
    const t = setTimeout(() => scroller.current?.scrollTo({ x: start * width, animated: false }), 0);
    return () => clearTimeout(t);
  }, [start]); // eslint-disable-line react-hooks/exhaustive-deps

  // Website: arrow keys move between photos, Escape closes.
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const arrow = (dir: -1 | 1) => {
    const hidden = dir < 0 ? index === 0 : index === urls.length - 1;
    if (Platform.OS !== 'web' || hidden) return null;
    return (
      <Pressable onPress={() => go(index + dir)} accessibilityLabel={dir < 0 ? 'Previous photo' : 'Next photo'}
        style={{ position: 'absolute', top: height / 2 - 26, [dir < 0 ? 'left' : 'right']: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={dir < 0 ? 'chevron-back' : 'chevron-forward'} size={28} color="#fff" />
      </Pressable>
    );
  };

  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#05121F' }}>
        <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
          onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {urls.map((u, i) => (
            <View key={u} style={{ width, height, padding: 8, paddingVertical: 64 }}>
              <Image source={{ uri: u }} contentFit="contain" style={{ flex: 1 }} accessibilityLabel={`Photo ${i + 1} of ${urls.length}`} />
            </View>
          ))}
        </ScrollView>
        {arrow(-1)}
        {arrow(1)}
        <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }} pointerEvents="box-none">
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 6 }}>
              {urls.length > 1 ? `${index + 1} of ${urls.length}` : ''}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close photos"
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
        {urls.length > 1 && (
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 28, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {urls.map((u, i) => (
              <View key={u} style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === index ? colors.gold : 'rgba(255,255,255,0.4)' }} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}
