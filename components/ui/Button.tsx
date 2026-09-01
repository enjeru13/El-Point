import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/lib/ThemeContext';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconTrailing,
  iconColor,
  fullWidth = true,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconTrailing?: string;
  iconColor?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { C, shadow } = useTheme();
  const off = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: C.primary, fg: '#fff', border: C.border },
    secondary: { bg: C.surface, fg: C.onSurface, border: C.border },
    ghost: { bg: 'transparent', fg: C.primary, border: 'transparent' },
    danger: { bg: C.surface, fg: C.error, border: C.border },
  };
  const p = palette[variant];
  const bg = off ? C.surfaceContainerHighest : p.bg;
  const fg = off ? C.outline : p.fg;
  const border = off ? C.outlineVariant : p.border;

  const height = size === 'md' ? 56 : 44;
  const fontSize = size === 'md' ? 16 : 14;
  const iconSize = size === 'md' ? 20 : 16;
  const boxShadow =
    off || variant === 'ghost'
      ? {}
      : variant === 'primary'
        ? shadow.primary
        : variant === 'secondary' || variant === 'danger'
          ? shadow.sm
          : {};

  function handlePress() {
    if (off) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        variant === 'danger' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
    }
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={off}
      style={({ pressed }) => [
        {
          height,
          borderRadius: height / 2,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 20,
          backgroundColor: bg,
          borderWidth: variant === 'ghost' ? 0 : 2,
          borderColor: border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: pressed && !off ? 0.9 : 1,
          transform: pressed && !off ? [{ translateY: 1 }] : [],
          ...boxShadow,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        icon && <Icon name={icon} size={iconSize} color={off ? fg : iconColor ?? fg} />
      )}
      <Text style={{ color: fg, fontFamily: 'Outfit_700Bold', fontSize }}>{label}</Text>
      {!loading && iconTrailing && <Icon name={iconTrailing} size={iconSize} color={fg} />}
      {/* keep row height stable while loading */}
      {loading && <View style={{ width: 0 }} />}
    </Pressable>
  );
}
