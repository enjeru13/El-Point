import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

/**
 * Branded loading screen shown while fonts + auth/role resolve. Rendered before
 * the theme providers mount, so every colour here is hard-coded (and matches the
 * native splash background so the handoff is seamless).
 */
const BG = "#ffffff";
const INK = "#1c1b1b";
const MUTED = "#6f5b54";
const BORDER = "#1c1b1b";
const DOT = "#ffb59e";

export function SplashScreenView() {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: BG,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 3,
          opacity: pulse,
        }}
      >
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            borderWidth: 2,
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
              backgroundColor: DOT,
              borderWidth: 2,
              borderColor: BORDER,
              marginBottom: 3,
              marginLeft: 2,
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}
