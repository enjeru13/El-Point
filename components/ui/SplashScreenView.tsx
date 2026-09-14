import { AppLogo } from "@/components/ui/AppLogo";
import { FoodBackdrop } from "@/components/ui/FoodBackdrop";
import { useEffect, useRef } from "react";
import { Animated, Easing, useColorScheme, View } from "react-native";

/**
 * Branded loading screen shown while auth/role resolve, after the native
 * (static) splash hands off. Rendered before the theme providers mount, so
 * colours follow the OS scheme (the app's explicit light/dark override isn't
 * known yet this early) — same reason it passes an explicit `variant` to
 * AppLogo instead of leaning on ThemeContext (its default value happens to
 * match light, but doesn't know the real OS scheme).
 */
const ACCENT = "#ff6a3d";

function LoaderDot({ anim }: { anim: Animated.Value }) {
  return (
    <Animated.View
      style={{
        width: 7,
        height: 7,
        borderRadius: 99,
        backgroundColor: ACCENT,
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0.3, 1],
              outputRange: [0, -4],
            }),
          },
        ],
      }}
    />
  );
}

export function SplashScreenView() {
  const dark = useColorScheme() === "dark";
  const BG = dark ? "#0b0b0d" : "#ffffff";

  const entrance = useRef(new Animated.Value(0)).current;
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(dot, {
            toValue: 1,
            duration: 380,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 380,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay((2 - i) * 140),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [entrance, dots]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: BG,
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
      }}
    >
      {/* Mismo fondo con iconos de comida flotando que login/onboarding —
          antes esta pantalla era un lienzo vacío, ahora comparte el motivo
          visual del resto del flujo de entrada. */}
      <FoodBackdrop
        seed={31}
        color={dark ? "#ff8a5c" : ACCENT}
        opacityScale={dark ? 1.6 : 0.7}
      />

      <Animated.View
        style={{
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
            {
              scale: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [0.94, 1],
              }),
            },
          ],
        }}
      >
        <AppLogo size="lg" variant={dark ? "dark" : "light"} />
      </Animated.View>

      <Animated.View
        style={{
          flexDirection: "row",
          gap: 7,
          opacity: entrance,
        }}
      >
        {dots.map((d, i) => (
          <LoaderDot key={i} anim={d} />
        ))}
      </Animated.View>
    </View>
  );
}
