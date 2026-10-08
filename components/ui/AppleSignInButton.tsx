import { isAppleSignInAvailable, signInWithApple } from "@/lib/apple";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useEffect, useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

/**
 * Botón oficial de Apple (AppleAuthenticationButton): Apple lo recomienda y es
 * lo más seguro para la revisión de la guía 4.8. Solo se muestra en iOS cuando
 * el build trae el módulo y el dispositivo lo soporta. Altura y esquinas iguales
 * a los demás botones de la pantalla (56, píldora).
 */
export function AppleSignInButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const toast = useToast();
  const { scheme } = useTheme();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let alive = true;
    isAppleSignInAvailable().then((ok) => alive && setAvailable(ok));
    return () => {
      alive = false;
    };
  }, []);

  if (!available) return null;

  // Se carga solo si el módulo existe: importarlo antes lanza en builds viejos.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AppleAuthentication = require("expo-apple-authentication") as typeof import("expo-apple-authentication");

  async function onPress() {
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e?.message !== "CANCELLED") {
        toast.error(e?.message ?? "No se pudo continuar con Apple");
      }
    }
  }

  return (
    <View style={style}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={
          scheme === "dark"
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={28}
        style={{ width: "100%", height: 56 }}
        onPress={onPress}
      />
    </View>
  );
}
