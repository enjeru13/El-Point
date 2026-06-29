import { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';

interface Props {
  left?: ReactNode;
  right?: ReactNode;
  border?: boolean;
}

export function ScreenHeader({ left, right, border = true }: Props) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: insets.top + 10,
      paddingBottom: 12,
      paddingHorizontal: 20,
      backgroundColor: C.surface,
      borderBottomWidth: border ? 2 : 0,
      borderBottomColor: C.outlineVariant,
    }}>
      <View>{left}</View>
      <View>{right}</View>
    </View>
  );
}
