import { useEffect, useState, type RefObject } from 'react';
import { AccessibilityInfo, Modal, Pressable, Text, View, type ViewInstance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, WIDE } from '../lib/theme';
import { Spotlight } from './Spotlight';

const SEEN = 'servly.logoTip.seen';  // saved once the tip is dismissed
const GUIDE = 'servly.guide.seen';   // the Home first-time guide (FirstTimeGuide)
const PAD = 6;
let shownThisLaunch = false;         // one tip at a time, even with several screens open
// Is the tip on screen right now? The merchant welcome tour on Account waits for it to close.
let tipOpen = false;
const openListeners = new Set<(open: boolean) => void>();
function setTipOpen(v: boolean) { tipOpen = v; openListeners.forEach((l) => l(v)); }
export function useLogoTipOpen() {
  const [open, setOpen] = useState(tipOpen);
  useEffect(() => { openListeners.add(setOpen); setOpen(tipOpen); return () => { openListeners.delete(setOpen); }; }, []);
  return open;
}

// Shows the logo tip again (after "How to use Servly" replays the Home guide).
export function resetLogoTip() { shownThisLaunch = false; AsyncStorage.removeItem(SEEN).catch(() => {}); }

// The first time someone opens a page with the small Servly logo at the top (a listing, a business, Account…),
// after they've been through the Home guide: the screen dims, the logo is lit up, and a card explains that it
// always goes back to Home. Once per device. Phones only (the apps, and the website on a phone-sized screen).
export function LogoTip({ logo }: { logo: RefObject<ViewInstance | null> }) {
  const [hole, setHole] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    if (WIDE || shownThisLaunch) return;
    let alive = true;
    Promise.all([AsyncStorage.getItem(GUIDE), AsyncStorage.getItem(SEEN)]).then(([guide, seen]) => {
      if (guide !== '1' || seen === '1' || shownThisLaunch) return;
      // Give the page a moment to appear, then find the logo on the screen.
      setTimeout(() => {
        if (!alive || shownThisLaunch) return;
        logo.current?.measureInWindow((x, y, w, h) => {
          if (!alive || !w) return;
          shownThisLaunch = true;
          setTipOpen(true);
          setHole({ x: x - PAD, y: y - PAD, w: w + PAD * 2, h: h + PAD * 2 });
          AccessibilityInfo.announceForAccessibility?.('Back to Home any time. Tap the Servly logo at the top of any page to go straight back to Home.');
        });
      }, 700);
    }).catch(() => {});
    return () => { alive = false; if (tipOpen) setTipOpen(false); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hole) return null;
  const done = () => { AsyncStorage.setItem(SEEN, '1').catch(() => {}); setHole(null); setTipOpen(false); };
  const shade = 'rgba(11, 58, 99, 0.82)'; // harbour blue, dimmed (same as the Home guide)

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={done}>
      <View style={{ flex: 1 }} accessibilityViewIsModal>
        {/* The dim, with a hole whose corners match the gold ring (no square corners showing). */}
        <Spotlight hole={hole} radius={14} color={shade} />
        <View pointerEvents="none" style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: 14, borderWidth: 3, borderColor: colors.gold }} />
        <View style={{ position: 'absolute', top: hole.y + hole.h + 14, left: 16, right: 16, maxWidth: 480, alignSelf: 'center',
          backgroundColor: colors.card, borderRadius: 20, padding: 18, gap: 8, boxShadow: '0px 16px 40px rgba(0, 0, 0, 0.3)' }}>
          <Text style={{ fontFamily: fonts.title, fontSize: 20, color: colors.ink }}>Back to Home any time</Text>
          <Text style={{ fontSize: 16, lineHeight: 23, color: colors.ink }}>
            Tap the Servly logo at the top of any page to go straight back to Home.
          </Text>
          <Pressable onPress={done} accessibilityRole="button"
            style={{ alignSelf: 'flex-end', marginTop: 6, height: 44, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.blue, justifyContent: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 15, color: '#fff' }}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
