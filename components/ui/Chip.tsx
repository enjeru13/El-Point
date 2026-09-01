import { Pressable, Text, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/lib/ThemeContext';

/** Selectable pill — category / filter chips. */
export function Chip({
  label,
  active,
  onPress,
  icon,
  tone = 'primary',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: string;
  tone?: 'primary' | 'secondary';
}) {
  const { C, shadow } = useTheme();
  const activeBg = tone === 'secondary' ? C.secondary : C.primary;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 99,
        borderWidth: 2,
        borderColor: active ? C.border : C.outlineVariant,
        backgroundColor: active ? activeBg : C.surface,
        ...(active ? shadow.sm : {}),
      }}
    >
      {icon && <Icon name={icon} size={15} color={active ? '#fff' : C.onSurfaceVariant} />}
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: 13,
          color: active ? '#fff' : C.onSurface,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Non-interactive tag. */
export function Tag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' }) {
  const { C } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
        borderWidth: 2,
        borderColor: C.border,
        backgroundColor: tone === 'accent' ? C.secondaryContainer : C.surface,
      }}
    >
      <Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: C.onSurface }}>
        {label}
      </Text>
    </View>
  );
}
