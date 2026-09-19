import { SplashScreenView } from "@/components/ui/SplashScreenView";
import { QA_MODE } from "@/lib/qa";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Pantalla DEV para ver cómo se ve la splash nativa sin hacer build: imita lo
// que pinta el SO (fondo + splash-logo*.png a 197 pt, centrado, "contain").
// Toca para alternar con la splash JS que viene justo después.
const LOGO_W = 197;
const LOGO_RATIO = 696 / 1579;

export default function SplashPreview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === "dark";
  const [showJs, setShowJs] = useState(false);

  const fg = dark ? "#ffffff" : "#1c1b1b";

  if (!QA_MODE) return null;

  return (
    <View style={{ flex: 1 }}>
      <Pressable style={{ flex: 1 }} onPress={() => setShowJs((v) => !v)}>
        {showJs ? (
          <SplashScreenView />
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: dark ? "#0b0b0d" : "#ffffff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={
                dark
                  ? require("@/assets/images/splash-logo-dark.png")
                  : require("@/assets/images/splash-logo.png")
              }
              style={{ width: LOGO_W, height: LOGO_W * LOGO_RATIO }}
              resizeMode="contain"
            />
          </View>
        )}
      </Pressable>

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          right: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: fg, opacity: 0.55, fontSize: 12 }}>
          {showJs ? "Splash JS" : "Splash nativa (simulada)"} · toca para alternar
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ paddingHorizontal: 10, paddingVertical: 4 }}
        >
          <Text style={{ color: fg, fontSize: 16, fontWeight: "700" }}>Cerrar</Text>
        </Pressable>
      </View>
    </View>
  );
}
