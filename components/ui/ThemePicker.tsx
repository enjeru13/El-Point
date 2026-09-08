import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { THEME_MODE_META } from '@/lib/themes';
import { Icon } from '@/components/ui/Icon';
import { AppText } from '@/components/ui/AppText';

function ModeOption({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { C, shadow } = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          flex: 1,
          alignItems: 'center',
          gap: 8,
          paddingVertical: 18,
          borderRadius: 18,
          backgroundColor: selected ? C.primaryFixed : C.surface,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? C.primary : C.border,
        },
        pressed ? { opacity: 0.75 } : null,
        selected ? shadow.sm : null,
      ]}
    >
      <Icon name={icon} size={26} color={selected ? C.primary : C.onSurfaceVariant} />
      <AppText variant="label" color={selected ? C.primary : C.onSurfaceVariant}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ThemePicker() {
  const { mode, setMode } = useTheme();
  return (
    <View style={{ width: '100%', flexDirection: 'row', gap: 12 }}>
      {THEME_MODE_META.map(({ mode: m, label, icon }) => (
        <ModeOption
          key={m}
          label={label}
          icon={icon}
          selected={mode === m}
          onPress={() => setMode(m)}
        />
      ))}
    </View>
  );
}
