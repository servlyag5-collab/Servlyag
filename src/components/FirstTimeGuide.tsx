import { useEffect, useRef, useState, type RefObject } from 'react';
import { AccessibilityInfo, Animated, Pressable, Text, View, useWindowDimensions, type ViewInstance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts } from '../lib/theme';
import { resetLogoTip } from './LogoTip';
import { Spotlight } from './Spotlight';

const SEEN = 'servly.guide.seen'; // saved on this device once the guide is finished or skipped
export const MERCHANT_SEEN = 'servly.merchantGuide.seen'; // the merchant welcome tour on Account
const PAD = 8;                    // space around the spotlighted part
const MAX_HOLE = 360;             // tall parts (the listings) are only lit at the top

export type GuideStep = { target: RefObject<ViewInstance | null>; title: string; text: string };

// "How to use Servly" (☰ menu, and a link on Home for guests) shows the guide again: Home listens with
// useGuideReplay and opens it when replayGuide() is called.
const replayers = new Set<() => void>();
export function replayGuide() { resetLogoTip(); replayers.forEach((open) => open()); }
export function useGuideReplay(open: () => void) {
  useEffect(() => {
    replayers.add(open);
    return () => { replayers.delete(open); };
  }, [open]);
}

// The merchant welcome tour (Account, Merchant view) has its own replay: "How to use Servly" in Merchant view.
const merchantReplayers = new Set<() => void>();
export function replayMerchantGuide() { merchantReplayers.forEach((open) => open()); }
export function useMerchantGuideReplay(open: () => void) {
  useEffect(() => {
    merchantReplayers.add(open);
    return () => { merchantReplayers.delete(open); };
  }, [open]);
}

// Has this device already seen the guide? (null while checking) `key`: which guide (Home by default).
export function useGuideSeen(key = SEEN) {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => { AsyncStorage.getItem(key).then((v) => setSeen(v === '1')).catch(() => setSeen(true)); }, [key]);
  return seen;
}

// The first-time guide on Home: the screen dims, one part at a time is lit up (search, area, listings…),
// and a card underneath says what it does. Next / Back / Skip; "Got it" on the last step. It is remembered
// on the device, so it only ever shows once. `root` is the view the guide covers (the targets live inside it);
// `scrollBy(dy)` scrolls Home by dy so the next part comes into view.
export function FirstTimeGuide({ steps, root, scrollBy, onClose, storageKey = SEEN }: {
  steps: GuideStep[]; root: RefObject<ViewInstance | null>; scrollBy: (dy: number) => void; onClose: () => void;
  storageKey?: string; // where "seen" is saved (the Home guide, or the merchant welcome tour)
}) {
  const [H, setH] = useState(useWindowDimensions().height); // height of the area the guide covers
  const [i, setI] = useState(0);
  const [hole, setHole] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  // Light up step i: scroll it into view if needed, then measure where it sits on screen.
  useEffect(() => {
    let alive = true;
    const measure = (then: (r: { x: number; y: number; w: number; h: number }) => void) => {
      const t = steps[i]?.target.current, r = root.current;
      if (!t || !r) return;
      // Where both sit on the screen right now, then the part's place inside the guide's area.
      // (measureLayout ignores how far Home is scrolled on Android, so the outline landed too low there.)
      r.measureInWindow((rx, ry) => {
        t.measureInWindow((x, y, w, h) => then({ x: x - rx, y: y - ry, w, h }));
      });
    };
    setHole(null);
    fade.setValue(0);
    measure((r) => {
      // Keep the lit part between the top area and the card below it.
      const want = Math.max(70, Math.min(r.y, H - Math.min(r.h, MAX_HOLE) - 280));
      const dy = r.y - want;
      if (Math.abs(dy) > 4) scrollBy(dy);
      setTimeout(() => {
        if (!alive) return;
        measure((m) => {
          setHole({ x: m.x - PAD, y: m.y - PAD, w: m.w + PAD * 2, h: Math.min(m.h, MAX_HOLE) + PAD * 2 });
          Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: false }).start();
          AccessibilityInfo.announceForAccessibility?.(`${steps[i].title}. ${steps[i].text}`);
        });
      }, Math.abs(dy) > 4 ? 420 : 30);
    });
    return () => { alive = false; };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  function finish() {
    AsyncStorage.setItem(storageKey, '1').catch(() => {});
    onClose();
  }

  const step = steps[i];
  const last = i === steps.length - 1;
  const shade = 'rgba(11, 58, 99, 0.82)'; // harbour blue, dimmed
  // The card goes under the lit part, or above it when there's no room underneath.
  const below = !hole || hole.y + hole.h + 230 < H;
  const cardPos = hole ? (below ? { top: hole.y + hole.h + 14 } : { bottom: H - hole.y + 14 }) : { top: H / 3 };

  return (
    <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} accessibilityViewIsModal onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {/* The dimmed screen, in four pieces around the lit part (taps on it do nothing). */}
      {hole ? (
        <>
          {/* The dim, with a hole whose corners match the gold ring (no square corners showing). */}
          <Spotlight hole={hole} radius={18} color={shade} />
          <Animated.View pointerEvents="none" style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h,
            borderRadius: 18, borderWidth: 3, borderColor: colors.gold, opacity: fade }} />
          {/* Taps inside the lit part are blocked too, so the guide can't be lost halfway. */}
          <View style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h }} />
        </>
      ) : <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: shade }} />}

      <Animated.View style={[{ position: 'absolute', left: 16, right: 16, maxWidth: 480, alignSelf: 'center', opacity: hole ? fade : 1,
        backgroundColor: colors.card, borderRadius: 20, padding: 18, gap: 8, boxShadow: '0px 16px 40px rgba(0, 0, 0, 0.3)' }, cardPos]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {steps.map((_, n) => (
            <View key={n} style={{ width: n === i ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: n === i ? colors.blue : colors.border }} />
          ))}
          <Text style={{ marginLeft: 'auto', color: colors.muted, fontSize: 13 }}>{i + 1} of {steps.length}</Text>
        </View>
        <Text style={{ fontFamily: fonts.title, fontSize: 20, color: colors.ink }}>{step.title}</Text>
        <Text style={{ fontSize: 16, lineHeight: 23, color: colors.ink }}>{step.text}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          {!last && (
            <Pressable onPress={finish} hitSlop={8} accessibilityRole="button">
              <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 15 }}>Skip</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }} />
          {i > 0 && (
            <Pressable onPress={() => setI(i - 1)} accessibilityRole="button"
              style={{ height: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: colors.ink }}>Back</Text>
            </Pressable>
          )}
          <Pressable onPress={() => (last ? finish() : setI(i + 1))} accessibilityRole="button"
            style={{ height: 44, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.blue, justifyContent: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 15, color: '#fff' }}>{last ? 'Got it' : 'Next'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
