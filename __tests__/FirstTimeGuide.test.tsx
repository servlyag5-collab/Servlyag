jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.setTimeout(20000);

import { createRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ViewInstance } from 'react-native';
import { FirstTimeGuide } from '../src/components/FirstTimeGuide';

const steps = [
  { target: createRef<ViewInstance>(), title: 'Search for any service', text: 'Type what you need.' },
  { target: createRef<ViewInstance>(), title: 'Pick your area', text: 'Choose a parish.' },
];

describe('First-time guide on Home', () => {
  beforeEach(() => AsyncStorage.clear());

  it('goes step by step, and "Got it" remembers it on this device', async () => {
    const onClose = jest.fn();
    await render(<FirstTimeGuide steps={steps} root={createRef()} scrollBy={() => {}} onClose={onClose} />);
    expect(screen.getByText('Search for any service')).toBeTruthy();
    expect(screen.getByText('1 of 2')).toBeTruthy();
    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Pick your area')).toBeTruthy();
    await fireEvent.press(screen.getByText('Back'));
    expect(screen.getByText('Search for any service')).toBeTruthy();
    await fireEvent.press(screen.getByText('Next'));
    await fireEvent.press(screen.getByText('Got it'));
    expect(onClose).toHaveBeenCalled();
    expect(await AsyncStorage.getItem('servly.guide.seen')).toBe('1');
  });

  it('Skip closes it and also remembers it', async () => {
    const onClose = jest.fn();
    await render(<FirstTimeGuide steps={steps} root={createRef()} scrollBy={() => {}} onClose={onClose} />);
    await fireEvent.press(screen.getByText('Skip'));
    expect(onClose).toHaveBeenCalled();
    expect(await AsyncStorage.getItem('servly.guide.seen')).toBe('1');
  });
});
