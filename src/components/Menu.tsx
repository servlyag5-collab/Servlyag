import { useCallback, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, usePathname, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setMode, useMode } from '../lib/mode';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { colors, ui } from '../lib/theme';

type Item = { label: string; hint?: string; path?: string; badge?: number; onPress: () => void };

// The ☰ button and its menu, for logged-in users. Guests see nothing here.
export function MenuButton() {
  const session = useSession();
  const uid = session?.user.id;
  const mode = useMode();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hasBooking, setHasBooking] = useState(false);
  const [hasListings, setHasListings] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!uid) return;
    // Only people with at least one listing can switch to merchant view.
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('merchant_id', uid)
      .then((c) => {
        const has = (c.count ?? 0) > 0;
        setHasListings(has);
        if (!has) setMode('customer');
      });
    supabase.from('notes').select('id, services!inner(merchant_id)', { count: 'exact', head: true })
      .eq('services.merchant_id', uid).is('read_at', null)
      .then((c) => setUnread(c.count ?? 0));
    // Bookings shows when the tier includes it (Business) or the owner switched the add-on on.
    Promise.all([
      supabase.from('profiles').select('tiers!tier_id(booking_included)').eq('id', uid).single(),
      supabase.from('services').select('id').eq('merchant_id', uid).eq('booking_enabled', true).limit(1),
    ]).then(([p, s]) => {
      const tier = p.data?.tiers as unknown as { booking_included: boolean } | null;
      setHasBooking(!!tier?.booking_included || (s.data?.length ?? 0) > 0);
    });
  }, [uid]));

  if (!session) return null;
  const merchant = mode === 'merchant';
  const go = (href: Href) => { setOpen(false); router.navigate(href); };

  function toggle() {
    setOpen(false);
    setMode(merchant ? 'customer' : 'merchant');
    // Messages means something different in each view, so move to the matching screen.
    if (['/inbox', '/messages', '/bookings'].includes(path)) router.replace(merchant ? '/messages' : '/inbox');
  }

  async function logOut() {
    setOpen(false);
    setMode('customer');
    await supabase.auth.signOut();
    router.replace('/');
  }

  const items: Item[] = [
    { label: 'Browse', path: '/', onPress: () => go('/') },
    merchant
      ? { label: 'Messages', path: '/inbox', badge: unread, onPress: () => go('/inbox') }
      : { label: 'Messages', path: '/messages', onPress: () => go('/messages') },
    ...(merchant && hasBooking ? [{ label: 'Bookings', path: '/bookings', onPress: () => go('/bookings') }] : []),
    ...(hasListings ? [{ label: merchant ? 'Customer' : 'Merchant', hint: merchant ? 'Switch to customer view' : 'Switch to merchant view', onPress: toggle }] : []),
    { label: 'Account', path: '/account', onPress: () => go('/account') },
  ];

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityLabel="Open menu">
        <Ionicons name="menu" size={30} color={colors.ink} />
        {merchant && unread > 0 && (
          <View style={{ position: 'absolute', top: -4, right: -8, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{unread}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(20,33,43,0.25)' }} onPress={() => setOpen(false)}>
          <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: insets.top + 56 }}>
            <Pressable style={[ui.card, { width: 300, maxWidth: '100%', padding: 12, gap: 4 }]}>
              <Text style={{ color: colors.blue, fontWeight: '800', letterSpacing: 2, fontSize: 12, paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 }}>
                {merchant ? 'MERCHANT VIEW' : 'CUSTOMER VIEW'}
              </Text>
              {items.map((it) => {
                const active = !!it.path && it.path === path;
                return (
                  <Pressable key={it.label} onPress={it.onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: active ? colors.blue : 'transparent' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: active ? '#fff' : colors.muted }}>{it.label}</Text>
                      {!!it.hint && <Text style={{ fontSize: 13, color: colors.muted }}>{it.hint}</Text>}
                    </View>
                    {!!it.badge && (
                      <View style={{ minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6, backgroundColor: active ? '#fff' : colors.red, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: active ? colors.blue : '#fff', fontSize: 12, fontWeight: '800' }}>{it.badge}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
              <Pressable onPress={logOut} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14 }}>
                <Ionicons name="log-out-outline" size={22} color={colors.red} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.red }}>Log out</Text>
              </Pressable>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// "← Back" on the left, a small Servly logo in the middle (tap = Home), the ☰ menu on the right.
// The two sides take equal space so the logo stays centred, even for guests (no ☰). Used on every inner screen.
export function TopBar() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>← Back</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => router.dismissTo('/')} accessibilityLabel="Servly home">
        <Image source={require('../../assets/logo.png')} style={{ height: 28, width: 106 }} resizeMode="contain" />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <MenuButton />
      </View>
    </View>
  );
}
