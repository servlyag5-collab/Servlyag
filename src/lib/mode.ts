import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Customer or Merchant view, switched from the menu and remembered on this device.
export type Mode = 'customer' | 'merchant';
const KEY = 'servly.mode';
let current: Mode = 'customer';
const listeners = new Set<(m: Mode) => void>();

AsyncStorage.getItem(KEY).then((v) => { if (v === 'merchant') setMode('merchant'); }).catch(() => {});

export function setMode(m: Mode) {
  current = m;
  listeners.forEach((l) => l(m));
  AsyncStorage.setItem(KEY, m).catch(() => {});
}

export function useMode() {
  const [m, setM] = useState(current);
  useEffect(() => {
    listeners.add(setM);
    setM(current);
    return () => { listeners.delete(setM); };
  }, []);
  return m;
}
