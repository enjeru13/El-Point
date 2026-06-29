import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { THEME_META, ThemeName } from '@/lib/themes';

const THEME_NAMES = Object.keys(THEME_META) as ThemeName[];

export function ThemePicker() {
  const { C, shadow, themeName, setTheme } = useTheme();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 8 }}
    >
      {THEME_NAMES.map(name => {
        const meta = THEME_META[name];
        const isSelected = themeName === name;
        return (
          <Pressable
            key={name}
            onPress={() => setTheme(name)}
            style={({ pressed }) => ({
              width: '47%',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: isSelected ? C.primary : C.outlineVariant,
              backgroundColor: meta.swatches[2],
              padding: 12,
              opacity: pressed ? 0.8 : 1,
              ...(isSelected ? shadow.md : {}),
            })}
          >
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
              {meta.swatches.map((color, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: color,
                    borderWidth: 1,
                    borderColor: '#1c1b1b22',
                  }}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                  color: '#1c1b1b',
                }}
              >
                {meta.label}
              </Text>
              {isSelected && (
                <MaterialCommunityIcons name="check-circle" size={18} color={C.primary} />
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
