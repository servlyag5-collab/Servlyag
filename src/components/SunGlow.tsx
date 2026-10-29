import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, type ViewStyle } from 'react-native';

const native = Platform.OS !== 'web';
const BREATHS = 3;      // how many times it grows and settles, then it stays still
const GROW = 1.08;      // 8% bigger at its widest
const HALF = 2600;      // milliseconds to grow (and again to settle)

// The faded outer ring of the Home hero's gold sun: it slowly grows a little and settles back,
// a few times after the page opens, then rests. Subtle on purpose. Still for reduce-motion users.
export function SunGlow({ style }: { style: ViewStyle }) {
  const s = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let run: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduce) => {
      if (reduce) return;
      const ease = Easing.inOut(Easing.sin);
      run = Animated.sequence([
        Animated.delay(600),
        Animated.loop(Animated.sequence([
          Animated.timing(s, { toValue: GROW, duration: HALF, easing: ease, useNativeDriver: native }),
          Animated.timing(s, { toValue: 1, duration: HALF, easing: ease, useNativeDriver: native }),
        ]), { iterations: BREATHS }),
      ]);
      run.start();
    });
    return () => run?.stop();
  }, [s]);
  return <Animated.View pointerEvents="none" style={[style, { transform: [{ scale: s }] }]} />;
}
