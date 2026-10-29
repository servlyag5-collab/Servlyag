import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CENTRE, type Focus } from '../lib/focus';
import { colors, ui } from '../lib/theme';

// The frame has the same shape as Home cards and the listing cover (16:10).
export const FRAME_RATIO = 1.6;

// "Position photo" (Offer a service / Edit listing): the merchant drags the photo inside the card
// frame to choose which part shows. The whole photo is still saved; only the focus spot changes.
export function PhotoFramer({ uri, focus, onDone, onClose }: {
  uri: string | null; focus: Focus; onDone: (f: Focus) => void; onClose: () => void;
}) {
  const { width: screenW } = useWindowDimensions();
  const fw = Math.min(screenW - 64, 520);
  const fh = Math.round(fw / FRAME_RATIO);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [f, setF] = useState<Focus>(focus);

  useEffect(() => {
    setF(focus);
    setSize(null);
    if (uri) Image.getSize(uri, (w, h) => setSize({ w, h }), () => setSize({ w: fw, h: fh }));
  }, [uri]); // eslint-disable-line react-hooks/exhaustive-deps

  // The photo is scaled to fill the frame; the extra width or height is what can be dragged.
  const scale = size ? Math.max(fw / size.w, fh / size.h) : 1;
  const sw = size ? size.w * scale : fw;
  const sh = size ? size.h * scale : fh;
  const spareX = sw - fw;
  const spareY = sh - fh;

  // Latest values for the drag handler (it is created once).
  const live = useRef({ f, spareX, spareY, start: f });
  live.current = { ...live.current, f, spareX, spareY };
  const drag = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { live.current.start = live.current.f; },
    onPanResponderMove: (_, g) => {
      const { start, spareX: sx, spareY: sy } = live.current;
      // Dragging right shows more of the left side, so the focus moves the other way.
      const x = sx > 0 ? Math.min(1, Math.max(0, start.x - g.dx / sx)) : 0.5;
      const y = sy > 0 ? Math.min(1, Math.max(0, start.y - g.dy / sy)) : 0.5;
      setF({ x, y });
    },
  })).current;

  const fits = !!size && spareX < 2 && spareY < 2;

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(11,58,99,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 12, width: fw + 32 }}>
          <Text style={ui.h2}>Position photo</Text>
          <Text style={ui.muted}>
            {fits ? 'This photo already fits the card exactly, so nothing is cut off.' : 'Drag the photo to choose which part shows on your listing card. Customers can still tap it to see the whole photo.'}
          </Text>
          <View {...drag.panHandlers} accessibilityLabel="Photo frame. Drag to move the photo."
            style={{ width: fw, height: fh, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.field, cursor: 'grab' } as object}>
            {!size ? <ActivityIndicator color={colors.blue} style={{ marginTop: fh / 2 - 10 }} /> : (
              <Image source={{ uri: uri! }}
                style={{ position: 'absolute', width: sw, height: sh, left: -spareX * f.x, top: -spareY * f.y }} />
            )}
            {!fits && !!size && (
              <View pointerEvents="none" style={{ position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Ionicons name="move" size={14} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Drag to move</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={() => setF(CENTRE)} disabled={fits}>
              <Text style={[ui.btnText, fits && { color: colors.muted }]}>Centre</Text>
            </Pressable>
            <Pressable style={[ui.btn, ui.outline, { flex: 1 }]} onPress={onClose}>
              <Text style={ui.btnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[ui.btn, ui.primary, { flex: 1.3 }]} onPress={() => onDone(f)}>
              <Text style={[ui.btnText, { color: '#fff' }]}>Use this</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
