import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { THEMES, THEME_META, ThemeName } from '@/lib/themes';
import { Icon } from '@/components/ui/Icon';

const THEME_NAMES = Object.keys(THEME_META) as ThemeName[];

function ThemeDot({ name, size = 52 }: { name: ThemeName; size?: number }) {
  const palette = THEMES[name];
  const r = size / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: r, borderWidth: 2, borderColor: '#1c1b1b' }}>
      <View style={{ flex: 1, borderRadius: r - 2, overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ width: (size - 4) / 2, height: size - 4, backgroundColor: palette.primary }} />
        <View style={{ width: (size - 4) / 2, height: size - 4, backgroundColor: palette.secondary }} />
      </View>
    </View>
  );
}


function ThemeOption({
  name,
  isSelected,
  onPress,
}: {
  name: ThemeName;
  isSelected: boolean;
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
          width: '30%',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 10,
          paddingVertical: 12,
          paddingHorizontal: 6,
          borderRadius: 20,
          backgroundColor: isSelected ? C.primaryFixed : 'transparent',
          borderWidth: 2,
          borderColor: isSelected ? C.primary : 'transparent',
        },
        pressed ? { opacity: 0.7 } : null,
        isSelected ? shadow.sm : null,
      ]}
    >
      <View>
        <ThemeDot name={name} size={52} />
        {isSelected && (
          <View style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 20, height: 20, borderRadius: 10,
            backgroundColor: C.primary,
            borderWidth: 2, borderColor: C.surface,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="check-circle" size={12} color="#fff" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function ThemePicker() {
  const { themeName, setTheme } = useTheme();

  return (
    <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 8, justifyContent: 'center' }}>
      {THEME_NAMES.map(name => (
        <ThemeOption
          key={name}
          name={name}
          isSelected={themeName === name}
          onPress={() => setTheme(name)}
        />
      ))}
    </View>
  );
}
