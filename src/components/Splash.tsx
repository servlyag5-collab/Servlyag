import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, View, useWindowDimensions } from 'react-native';
import { colors, flag } from '../lib/theme';

const LOGO = require('../../assets/logo.png');
const RATIO = 549 / 2066; // logo.png height / width
const PIN = 0.215;        // the blue pin is the left 21.5% of logo.png
const WORD = 0.275;       // "Servly AG" + tagline start at 27.5%
const native = Platform.OS !== 'web'; // the web can't run animations on the native thread

// Opening animation, shown once per app launch: the pin drops in and bounces, the name slides in,
// a flag ribbon sweeps underneath, then the screen fades into the app. It waits for `ready`
// (the login check) before fading. People with "reduce motion" on get a still logo instead.
export function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width - 48, 340);
  const H = W * RATIO;
  const drop = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const ribbon = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((reduce) => {
      if (!alive) return;
      if (reduce) {
        drop.setValue(1); word.setValue(1); ribbon.setValue(1);
        setTimeout(() => alive && setIntroDone(true), 600);
        return;
      }
      // About 3 seconds in total: drop ~1s, name 0.6-1.2s, ribbon 1.15-1.95s, pause 0.65s, fade 0.4s.
      Animated.parallel([
        Animated.spring(drop, { toValue: 1, friction: 5, tension: 50, useNativeDriver: native }),
        Animated.timing(word, { toValue: 1, duration: 600, delay: 600, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
        Animated.timing(ribbon, { toValue: 1, duration: 800, delay: 1150, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      ]).start(() => { setTimeout(() => alive && setIntroDone(true), 650); });
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (introDone && ready) Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: native }).start(() => onDone());
  }, [introDone, ready]);

  return (
    <Animated.View accessible accessibilityLabel="Servly AG" style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
      backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', opacity: fade,
    }}>
      <View style={{ width: W, height: H }}>
        {/* The pin: the left part of the logo, dropping from above with a bounce. */}
        <Animated.View style={{
          position: 'absolute', left: 0, top: 0, width: W * PIN, height: H, overflow: 'hidden',
          opacity: drop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-H * 2, 0] }) }],
        }}>
          <Image source={LOGO} style={{ width: W, height: H }} />
        </Animated.View>
        {/* The name and tagline: the right part of the logo, sliding in. */}
        <Animated.View style={{
          position: 'absolute', left: W * WORD, top: 0, width: W * (1 - WORD), height: H, overflow: 'hidden',
          opacity: word,
          transform: [{ translateX: word.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
        }}>
          <Image source={LOGO} style={{ width: W, height: H, marginLeft: -W * WORD }} />
        </Animated.View>
      </View>
      {/* Flag ribbon sweeping in underneath, same colours as the Home hero card. */}
      <Animated.View style={{ marginTop: 24, height: 4, borderRadius: 2, overflow: 'hidden', alignSelf: 'center',
        width: ribbon.interpolate({ inputRange: [0, 1], outputRange: [0, W] }) }}>
        <View style={{ width: W, height: 4, flexDirection: 'row' }}>
          {flag.map((s, i) => <View key={i} style={{ flex: s.flex, backgroundColor: s.color }} />)}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
