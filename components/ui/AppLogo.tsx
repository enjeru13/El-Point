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
 * Logo de marca: "el" + la P de "Point" reemplazada por el círculo+P del
 * ícono de la app — se lee como una sola palabra ("el 🅟oint" = "el
 * Point") con la marca del ícono integrada en el propio wordmark, en vez
 * de un icono suelto al lado del texto.
 */
export function AppLogo({ size = "md", variant = "light" }: Props) {
  const { C } = useTheme();
  const scale = size === "sm" ? 0.75 : size === "lg" ? 1.8 : 1;
  const isDark = variant === "dark";

  const textColor = isDark ? "#ffffff" : C.onSurface;
  const subColor = isDark ? "rgba(255,255,255,0.62)" : C.onSurfaceVariant;
  const badgeRing = isDark ? "rgba(255,255,255,0.35)" : "rgba(28,27,27,0.08)";

  const ointSize = Math.round(26 * scale);
  // Círculo tan alto como la línea de "oint" — la P llena el mismo
  // espacio que ocuparía la letra si estuviera escrita.
  const badge = ointSize;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: Math.round(6 * scale) }}>
      <Text
        style={{
          fontFamily: "Outfit_700Bold",
          fontSize: Math.round(13 * scale),
          color: subColor,
        }}
      >
        el
      </Text>

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
          shadowOffset: { width: 0, height: Math.round(1.5 * scale) },
          shadowOpacity: 0.2,
          shadowRadius: Math.round(2.5 * scale),
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

      <Text
        style={{
          fontFamily: "Outfit_800ExtraBold",
          fontSize: ointSize,
          lineHeight: ointSize,
          letterSpacing: -0.5,
          color: textColor,
          marginLeft: -Math.round(2 * scale),
        }}
      >
        oint
      </Text>
    </View>
  );
}
