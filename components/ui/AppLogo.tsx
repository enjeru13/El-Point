import { useTheme } from "@/lib/ThemeContext";
import { Text, View } from "react-native";

type Props = {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
};

export function AppLogo({ size = "md", variant = "light" }: Props) {
  const { C } = useTheme();
  const scale = size === "sm" ? 0.75 : size === "lg" ? 1.8 : 1;
  const isDark = variant === "dark";

  const textColor = isDark ? "#ffffff" : C.onSurface;
  const subColor = isDark ? "rgba(255,255,255,0.6)" : C.onSurfaceVariant;
  const borderColor = isDark ? "rgba(255,255,255,0.4)" : C.border;
  const dotColor = isDark ? "#ff5a1f" : C.primaryContainer;
  const dotBorder = isDark ? "rgba(255,255,255,0.5)" : C.border;

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
      {/* "el" — pequeño, outline */}
      <View
        style={{
          paddingHorizontal: Math.round(6 * scale),
          paddingVertical: Math.round(3 * scale),
          borderRadius: Math.round(6 * scale),
          borderWidth: 2,
          borderColor,
          marginBottom: Math.round(3 * scale),
        }}
      >
        <Text
          style={{
            fontFamily: "Outfit_700Bold",
            fontSize: Math.round(13 * scale),
            color: subColor,
            lineHeight: Math.round(13 * scale),
          }}
        >
          el
        </Text>
      </View>

      {/* "Point" + dot */}
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <Text
          style={{
            fontFamily: "Outfit_800ExtraBold",
            fontSize: Math.round(26 * scale),
            color: textColor,
            lineHeight: Math.round(26 * scale),
            letterSpacing: -0.5,
          }}
        >
          Point
        </Text>
        <View
          style={{
            width: Math.round(7 * scale),
            height: Math.round(7 * scale),
            borderRadius: 99,
            backgroundColor: dotColor,
            borderWidth: 2,
            borderColor: dotBorder,
            marginBottom: Math.round(2 * scale),
            marginLeft: 1,
          }}
        />
      </View>
    </View>
  );
}
