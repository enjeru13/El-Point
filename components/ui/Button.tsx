import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ActivityIndicator, Platform, Pressable, Text } from "react-native";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

type ButtonProps = {
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
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconTrailing,
  iconColor,
  fullWidth = true,
  style,
}: ButtonProps) {
  const { C } = useTheme();
  const [pressed, setPressed] = useState(false);
  const off = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: C.primary, fg: "#ffffff", border: C.border },
    secondary: { bg: C.primaryFixed, fg: C.onSurface, border: C.border },
    ghost: { bg: "transparent", fg: C.primary, border: "transparent" },
    danger: { bg: C.error, fg: "#ffffff", border: C.border },
  };
  const p = palette[variant];
  const bg = off ? C.surfaceContainerHighest : p.bg;
  const fg = off ? C.outline : p.fg;
  const border = off ? C.outlineVariant : p.border;

  const height = size === "md" ? 56 : 44;
  const fontSize = size === "md" ? 16 : 14;
  const iconSize = size === "md" ? 20 : 16;
  const withShadow = !off && variant !== "ghost";

  function handlePress() {
    if (off) return;
    if (Platform.OS !== "web") {
      try {
        // lazily required so a missing native module can never break render
        const Haptics = require("expo-haptics");
        Haptics.impactAsync(
          variant === "danger"
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        ).catch(() => {});
      } catch {}
    }
    onPress();
  }

  const base: ViewStyle = {
    height,
    borderRadius: height / 2,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    backgroundColor: bg,
    borderWidth: variant === "ghost" ? 0 : 2,
    borderColor: border,
    alignSelf: fullWidth ? "stretch" : "flex-start",
  };
  if (withShadow) {
    base.shadowColor = variant === "primary" ? C.primary : "#1c1b1b";
    base.shadowOffset = { width: 3, height: 3 };
    base.shadowOpacity = variant === "primary" ? 0.5 : 1;
    base.shadowRadius = 0;
    base.elevation = 4;
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={off}
      style={[
        base,
        pressed && !off
          ? { opacity: 0.9, transform: [{ translateY: 1 }] }
          : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Icon
          name={icon}
          size={iconSize}
          color={off ? fg : (iconColor ?? fg)}
        />
      ) : null}

      <Text style={{ color: fg, fontFamily: "Outfit_700Bold", fontSize }}>
        {label}
      </Text>

      {!loading && iconTrailing ? (
        <Icon name={iconTrailing} size={iconSize} color={fg} />
      ) : null}
    </Pressable>
  );
}
