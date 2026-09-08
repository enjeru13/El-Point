import { View } from "react-native";
import { FoodBackdrop } from "@/components/ui/FoodBackdrop";
import { useTheme } from "@/lib/ThemeContext";

/**
 * Full-bleed animated backdrop for the auth screens. Light: warm brand-orange
 * field with white food icons. Dark: near-black field with orange icons.
 * Absolutely positioned — drop it as the first child of the screen's root View.
 */
export function AuthBackground({ seed = 7 }: { seed?: number }) {
  const { C, scheme } = useTheme();
  const dark = scheme === "dark";
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: dark ? C.background : C.primary,
      }}
    >
      <FoodBackdrop
        seed={seed}
        color={dark ? "#ff8a5c" : "#ffffff"}
        opacityScale={dark ? 2.6 : 1}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: dark ? "rgba(0,0,0,0.35)" : "rgba(94,20,0,0.28)",
        }}
      />
    </View>
  );
}
