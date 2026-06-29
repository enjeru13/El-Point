import { useState } from 'react';
import { TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { C } from '@/lib/theme';

interface Props extends TextInputProps {
  containerStyle?: ViewStyle;
  children?: React.ReactNode;
}

export function AppTextInput({ containerStyle, style, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      {...props}
      onFocus={e => { setFocused(true); onFocus?.(e); }}
      onBlur={e => { setFocused(false); onBlur?.(e); }}
      style={[
        {
          flex: 1,
          fontSize: 16,
          fontFamily: 'PlusJakartaSans_400Regular',
          color: C.onSurface,
          padding: 0,
          margin: 0,
          includeFontPadding: false,
          textAlignVertical: 'center',
        },
        style,
      ]}
      placeholderTextColor={C.outline + '99'}
    />
  );
}

/** Wrapper de campo — maneja borde naranja en focus */
export function InputWrapper({
  focused,
  children,
  style,
}: {
  focused: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 16,
          height: 56,
          paddingHorizontal: 16,
          gap: 12,
          backgroundColor: C.surfaceContainerLow,
          borderWidth: 2,
          borderColor: focused ? C.primary : C.outlineVariant,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
