import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, ui } from '../lib/theme';

// A password box with an eye button on the right: tap to show what you typed (to check for typos),
// tap again to hide it. Used on Log in / Sign up and Reset password.
export function PasswordInput(props: Omit<TextInputProps, 'secureTextEntry'>) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <TextInput {...props} style={[ui.field, { paddingRight: 52 }, props.style]} secureTextEntry={!show}
        autoCapitalize="none" autoCorrect={false} />
      <Pressable onPress={() => setShow(!show)} hitSlop={8} accessibilityRole="button"
        accessibilityLabel={show ? 'Hide password' : 'Show password'}
        style={{ position: 'absolute', right: 4, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.muted} />
      </Pressable>
    </View>
  );
}
