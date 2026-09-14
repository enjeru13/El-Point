import { useTheme } from "@/lib/ThemeContext";
import { Text, View } from "react-native";

type Props = {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
};

// Marca fija — el mismo naranja del ícono de la app, sin importar tema. El
// logo es identidad, no debe cambiar de color con light/dark.
const BRAND = "#c8451f";

/**
 * Logo de marca: círculo+P (misma marca del ícono de la app) + wordmark
 * "el Point". Antes era solo texto ("el" en chip + "Point" + un punto
 * suelto) — ahora el círculo+P hace de ancla visual y conecta el logo con
 * el ícono en la pantalla de inicio.
 */
export function AppLogo({ size = "md", variant = "light" }: Props) {
  const { C } = useTheme();
  const scale = size === "sm" ? 0.75 : size === "lg" ? 1.8 : 1;
  const isDark = variant === "dark";

  const textColor = isDark ? "#ffffff" : C.onSurface;
  const subColor = isDark ? "rgba(255,255,255,0.62)" : C.onSurfaceVariant;
  const badgeRing = isDark ? "rgba(255,255,255,0.35)" : "rgba(28,27,27,0.08)";

  const badge = Math.round(24 * scale);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: Math.round(7 * scale) }}>
      <View
        style={{
          width: badge,
          height: badge,
          borderRadius: badge / 2,
          backgroundColor: BRAND,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: badgeRing,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: Math.round(2 * scale) },
          shadowOpacity: 0.2,
          shadowRadius: Math.round(3 * scale),
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontFamily: "Outfit_800ExtraBold",
            fontSize: Math.round(badge * 0.56),
            lineHeight: Math.round(badge * 0.62),
            color: "#ffffff",
          }}
        >
          P
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <Text
          style={{
            fontFamily: "Outfit_700Bold",
            fontSize: Math.round(13 * scale),
            lineHeight: Math.round(13 * scale),
            color: subColor,
            marginBottom: Math.round(4 * scale),
            marginRight: Math.round(4 * scale),
          }}
        >
          el
        </Text>
        <Text
          style={{
            fontFamily: "Outfit_800ExtraBold",
            fontSize: Math.round(26 * scale),
            lineHeight: Math.round(26 * scale),
            letterSpacing: -0.5,
            color: textColor,
          }}
        >
          Point
        </Text>
      </View>
    </View>
  );
}
