import { useEffect, useRef } from "react";
import { Animated, Easing, Text, useColorScheme, View } from "react-native";

/**
 * Branded loading screen shown while auth/role resolve, after the native
 * (static) splash hands off. Rendered before the theme providers mount, so
 * colours follow the OS scheme (the app's explicit light/dark override isn't
 * known yet this early).
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
  const INK = dark ? "#f4f4f5" : "#1c1b1b";
  const MUTED = dark ? "#b4b4b8" : "#6f5b54";
  const BORDER = dark ? "#35353c" : "#1c1b1b";

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
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 3,
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
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: BORDER,
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit_700Bold",
              fontSize: 18,
              lineHeight: 18,
              color: MUTED,
            }}
          >
            el
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <Text
            style={{
              fontFamily: "Outfit_800ExtraBold",
              fontSize: 36,
              lineHeight: 36,
              letterSpacing: -0.5,
              color: INK,
            }}
          >
            Point
          </Text>
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 99,
              backgroundColor: ACCENT,
              borderWidth: 1,
              borderColor: BORDER,
              marginBottom: 3,
              marginLeft: 2,
            }}
          />
        </View>
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
