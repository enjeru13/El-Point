import { Button } from "@/components/ui/Button";
import { isAppleSignInAvailable, signInWithApple } from "@/lib/apple";
import { useToast } from "@/lib/toast";
import { useEffect, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";

/**
 * "Continuar con Apple". Solo se muestra en iOS cuando el build trae el módulo
 * y el dispositivo lo soporta. Mismo peso visual que el botón de Google
 * (la guía 4.8 pide una opción equivalente).
 */
export function AppleSignInButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const toast = useToast();
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    isAppleSignInAvailable().then((ok) => alive && setAvailable(ok));
    return () => {
      alive = false;
    };
  }, []);

  if (!available) return null;

  async function onPress() {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e?.message !== "CANCELLED") {
        toast.error(e?.message ?? "No se pudo continuar con Apple");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      label={loading ? "Conectando…" : "Continuar con Apple"}
      onPress={onPress}
      loading={loading}
      variant="secondary"
      icon="apple"
      style={style}
    />
  );
}
