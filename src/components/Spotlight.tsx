import { View, useWindowDimensions } from 'react-native';

export type Hole = { x: number; y: number; w: number; h: number };

// Dims the whole screen except a ROUNDED hole, so the gold ring sits on a clean edge with no
// un-dimmed square corners outside it. It is one view with a very thick border in the dim colour:
// the inside of the border is the hole, and its corners are rounded to `radius`.
// Taps on the dimmed part (and inside the hole) are caught, so nothing underneath can be pressed.
export function Spotlight({ hole, radius, color }: { hole: Hole; radius: number; color: string }) {
  const { width, height } = useWindowDimensions();
  const b = Math.ceil(Math.max(width, height) * 2); // thick enough to cover the screen from any hole
  return (
    <View style={{ position: 'absolute', left: hole.x - b, top: hole.y - b, width: hole.w + b * 2, height: hole.h + b * 2,
      borderWidth: b, borderColor: color, borderRadius: radius + b }} />
  );
}
