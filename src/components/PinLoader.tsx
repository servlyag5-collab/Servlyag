import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, View } from 'react-native';

const LOGO = require('../../assets/logo.png');
const RATIO = 549 / 2066; // logo.png height / width
const PIN = 0.215;        // the blue pin (with its S) is the left 21.5% of logo.png
const native = Platform.OS !== 'web'; // the web can't run animations on the native thread

// Servly's loading sign: the blue pin turning like a coin while a page loads. A soft shadow under it
// narrows as the pin turns edge-on. People who ask their phone to reduce motion get a still pin.
export function PinLoader({ size = 44 }: { size?: number }) {
  const turn = useRef(new Animated.Value(0)).current;
  const [still, setStill] = useState(false);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduce) => {
      if (reduce) return setStill(true);
      loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.cubic), useNativeDriver: native }));
      loop.start();
    });
    return () => loop?.stop();
  }, [turn]);

  const logoW = (size / RATIO); // logo.png scaled so its height = size
  const pinW = logoW * PIN;
  const rotateY = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const shadow = turn.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.35, 1, 0.35, 1] });

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ alignSelf: 'center', alignItems: 'center', paddingVertical: 12, gap: 4 }}>
      <Animated.View style={{ width: pinW, height: size, overflow: 'hidden', transform: still ? [] : [{ perspective: 400 }, { rotateY }] }}>
        <Image source={LOGO} style={{ width: logoW, height: size }} />
      </Animated.View>
      <Animated.View style={{ width: pinW * 0.8, height: Math.max(3, size * 0.08), borderRadius: 99, backgroundColor: 'rgba(11, 58, 99, 0.18)',
        transform: still ? [] : [{ scaleX: shadow }] }} />
    </View>
  );
}
