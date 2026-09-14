import { useTheme } from "@/lib/ThemeContext";
import { Image } from "expo-image";
import { Text, View } from "react-native";

type Props = {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
};

// Proporción real del recorte en assets/images/logo-pin.png (alto/ancho).
const PIN_RATIO = 689 / 557;

/**
 * Logo de marca: "el Point" en tipografía limpia + el pin del ícono de la
 * app como acento al final, en vez de un punto plano — mismo mark que el
 * ícono real, así el logo y el ícono se leen como la misma marca.
 */
export function AppLogo({ size = "md", variant = "light" }: Props) {
  const { C } = useTheme();
  const scale = size === "sm" ? 0.75 : size === "lg" ? 1.8 : 1;
  const isDark = variant === "dark";

  const textColor = isDark ? "#ffffff" : C.onSurface;
  const subColor = isDark ? "rgba(255,255,255,0.62)" : C.onSurfaceVariant;

  const pointSize = Math.round(26 * scale);
  const pinH = Math.round(pointSize * 1.1);
  const pinW = Math.round(pinH / PIN_RATIO);

  // "el" y "Point" van en contenedores de la misma altura, centrados
  // adentro — el lineHeight "natural" de cada <Text> no coincide entre
  // tamaños distintos y se ve corrido si se deja al alineado del row.
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: Math.round(6 * scale) }}>
      <View style={{ height: pointSize, justifyContent: "center" }}>
        <Text
          style={{
            fontFamily: "Outfit_700Bold",
            fontSize: Math.round(13 * scale),
            color: subColor,
            includeFontPadding: false,
          }}
        >
          el
        </Text>
      </View>

      <View style={{ height: pointSize, justifyContent: "center" }}>
        <Text
          style={{
            fontFamily: "Outfit_800ExtraBold",
            fontSize: pointSize,
            letterSpacing: -0.5,
            color: textColor,
            includeFontPadding: false,
          }}
        >
          Point
        </Text>
      </View>

      <Image
        source={require("@/assets/images/logo-pin.png")}
        style={{ width: pinW, height: pinH, marginBottom: -Math.round(pinH * 0.05) }}
        contentFit="contain"
      />
    </View>
  );
}
