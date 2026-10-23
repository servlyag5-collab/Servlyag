import { StyleSheet } from 'react-native';

export const colors = {
  blue: '#0072C6', red: '#CE1126', black: '#111111', gold: '#FCD116',
  ink: '#14212B', muted: '#5A6B70', bg: '#FAFAF7', card: '#FFFFFF', field: '#F3F3EF', border: '#D9D6CC',
};

// Flag ribbon, left to right, mirrored. Built around the most recognisable part of the Antigua and
// Barbuda flag: the gold rising sun on black, framed by the red sides of the V.
//   blue  = trust, calm, the sea: the main colour (both sides and the long runs)
//   white = breathing space so the centre motif stands out
//   red, black = energy and strength: thin accents only
//   gold  = warmth and optimism, the sun: the centrepiece and the widest accent
// Always keep all five flag colours, including gold. `flex` is each stripe's share of the width.
export const flag = [
  { color: colors.blue, flex: 5 }, { color: '#FFFFFF', flex: 0.5 }, { color: colors.red, flex: 0.6 }, { color: colors.black, flex: 0.8 },
  { color: colors.gold, flex: 1.6 },
  { color: colors.black, flex: 0.8 }, { color: colors.red, flex: 0.6 }, { color: '#FFFFFF', flex: 0.5 }, { color: colors.blue, flex: 5 },
];

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 16, gap: 12, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 12 },
  field: { backgroundColor: colors.field, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, height: 52, fontSize: 16, color: colors.ink },
  btn: { height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { backgroundColor: colors.blue },
  outline: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  btnText: { fontSize: 16, fontWeight: '700' },
  h1: { fontSize: 32, fontWeight: '800', color: colors.ink },
  h2: { fontSize: 24, fontWeight: '800', color: colors.ink },
  muted: { fontSize: 16, color: colors.muted, lineHeight: 24 },
  row: { flexDirection: 'row', gap: 12 },
  error: { color: colors.red, fontSize: 14 },
});
