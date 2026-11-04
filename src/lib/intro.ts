import { useEffect, useState } from 'react';

// Whether the opening animation (Splash) has finished, so Home can wait for it before showing the
// first-time guide. _layout.tsx calls introDone() when the animation fades out.
let done = false;
const listeners = new Set<() => void>();

export function introDone() {
  done = true;
  listeners.forEach((l) => l());
}

export function useIntroDone() {
  const [d, setD] = useState(done);
  useEffect(() => {
    const l = () => setD(true);
    listeners.add(l);
    setD(done);
    return () => { listeners.delete(l); };
  }, []);
  return d;
}
