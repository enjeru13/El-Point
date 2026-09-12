import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { StarBadge } from "@/components/ui/StarBadge";
import { useTheme } from "@/lib/ThemeContext";
import { impact, notify } from "@/lib/haptics";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, View } from "react-native";
import type { SearchResult } from "@/lib/queries/search";

// Slot-machine cadence — quick ticks that slow down toward the landing.
const CYCLE_DELAYS = [70, 75, 85, 100, 120, 150, 190, 240, 300, 380];

const CONFETTI = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  const colors = ["#c8451f", "#e0632f", "#e0a53f", "#2f855a", "#3ad6c4"];
  return { dx: Math.cos(angle), dy: Math.sin(angle), color: colors[i % colors.length] };
});

/** "¿Qué comer hoy?" reveal — cycles through real candidates like a slot
 *  machine (each tick actually slides/flips, not just a content swap),
 *  decelerating into the real pick, then lands with a bounce + confetti
 *  burst. Lives outside any one screen's layout on purpose (it's a
 *  decision tool, not a list). */
export function QuickPickModal({
  visible,
  pool,
  result,
  onReroll,
  onGo,
  onClose,
}: {
  visible: boolean;
  /** Candidate restaurants to flicker through while "rolling". */
  pool: SearchResult[];
  /** The actual pick — null while still rolling. */
  result: SearchResult | null;
  onReroll: () => void;
  onGo: () => void;
  onClose: () => void;
}) {
  const { C, shadow } = useTheme();
  const [display, setDisplay] = useState<SearchResult | null>(null);
  const [settled, setSettled] = useState(false);

  const slideY = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const anims = useRef<Animated.CompositeAnimation[]>([]);

  function track(a: Animated.CompositeAnimation) {
    anims.current.push(a);
    return a;
  }

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    anims.current.forEach((a) => a.stop());
    anims.current = [];

    if (!visible || !result || pool.length === 0) {
      setDisplay(null);
      setSettled(false);
      return;
    }

    setSettled(false);
    scale.setValue(0.9);
    shimmer.setValue(0);
    burst.setValue(0);
    slideY.setValue(0);
    tilt.setValue(0);
    cardOpacity.setValue(1);

    // Slow ambient spin on the dice badge while it's rolling.
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true }),
    );
    track(spinLoop).start();

    function step(i: number) {
      const isLast = i === CYCLE_DELAYS.length - 1;
      const delay = CYCLE_DELAYS[i];
      const outDur = Math.min(80, delay * 0.55);
      const inDur = Math.min(100, delay * 0.55);

      track(
        Animated.parallel([
          Animated.timing(slideY, { toValue: -18, duration: outDur, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(tilt, { toValue: i % 2 === 0 ? -1 : 1, duration: outDur, useNativeDriver: true }),
          Animated.timing(cardOpacity, { toValue: 0.15, duration: outDur, useNativeDriver: true }),
        ]),
      ).start(() => {
        const next = isLast ? result! : (pool[Math.floor(Math.random() * pool.length)] ?? result!);
        setDisplay(next);
        slideY.setValue(18);
        tilt.setValue(0);

        track(
          Animated.parallel([
            Animated.timing(slideY, { toValue: 0, duration: inDur, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(cardOpacity, { toValue: 1, duration: inDur, useNativeDriver: true }),
          ]),
        ).start(() => {
          if (isLast) {
            spinLoop.stop();
            settle();
          } else {
            impact("light");
            const t = setTimeout(() => step(i + 1), Math.max(0, delay - outDur - inDur));
            timers.current.push(t);
          }
        });
      });
    }

    function settle() {
      setSettled(true);
      notify("success");
      burst.setValue(0);
      track(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, friction: 4.5, tension: 160, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(rotate, { toValue: 1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(rotate, { toValue: -1, duration: 150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(rotate, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]),
          Animated.timing(shimmer, { toValue: 1, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(burst, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ).start();
    }

    step(0);

    return () => {
      timers.current.forEach(clearTimeout);
      anims.current.forEach((a) => a.stop());
    };
  }, [visible, result, pool]);

  const item = display;
  const rotateDeg = rotate.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-6deg", "0deg", "6deg"] });
  const tiltDeg = tilt.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-3deg", "0deg", "3deg"] });
  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(12,9,7,0.68)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: 28,
            backgroundColor: C.surface,
            padding: 24,
            gap: 16,
            overflow: "hidden",
            ...shadow.lg,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10} style={{ alignSelf: "flex-end", marginBottom: -12 }}>
            <Icon name="close" size={20} color={C.outline} />
          </Pressable>

          {!item ? (
            <View style={{ alignItems: "center", gap: 14, paddingVertical: 28 }}>
              <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
                <Icon name="dice-multiple-outline" size={40} color={C.primary} />
              </Animated.View>
              <AppText variant="bodyStrong" align="center">Pensando qué se te antoja…</AppText>
            </View>
          ) : (
            <Animated.View style={{ gap: 16, transform: [{ scale }, { rotate: settled ? rotateDeg : "0deg" }] }}>
              <Animated.View
                style={{
                  transform: [{ translateY: slideY }, { rotate: settled ? "0deg" : tiltDeg }],
                  opacity: cardOpacity,
                }}
              >
                <View
                  style={{
                    height: 140,
                    borderRadius: 18,
                    overflow: "hidden",
                    backgroundColor: C.primaryFixed,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: settled ? 2 : 0,
                    borderColor: C.primary,
                  }}
                >
                  {item.cover_url ? (
                    <Image source={{ uri: item.cover_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={0} />
                  ) : (
                    <Icon name={item.categories[0]?.icon ?? "silverware-fork-knife"} size={56} color={C.primary} style={{ opacity: 0.5 }} />
                  )}
                  {settled && (
                    <Animated.View
                      pointerEvents="none"
                      style={{
                        position: "absolute", inset: 0,
                        backgroundColor: "#fff",
                        opacity: shimmer.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
                      }}
                    />
                  )}
                  {settled && (
                    <View style={{ position: "absolute", top: 10, right: 10 }}>
                      <StarBadge rating={item.rating_avg} count={item.rating_count} size="sm" />
                    </View>
                  )}
                </View>
              </Animated.View>

              <View style={{ gap: 4 }}>
                <AppText variant="overline" color={C.primary}>
                  {settled ? "HOY COMES EN" : "…"}
                </AppText>
                <AppText variant="title" style={{ fontSize: 22, lineHeight: 27 }} numberOfLines={1}>
                  {item.name}
                </AppText>
                {settled && item.categories[0] && (
                  <AppText variant="bodySm" color={C.onSurfaceVariant}>{item.categories[0].label}</AppText>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 10, opacity: settled ? 1 : 0.4 }}>
                <Button label="Otro" onPress={onReroll} variant="secondary" icon="dice-5-outline" style={{ flex: 1 }} disabled={!settled} />
                <Button label="Vamos" onPress={onGo} iconTrailing="arrow-right" style={{ flex: 1 }} disabled={!settled} />
              </View>

              {/* Confetti burst, centered over the card */}
              {settled && (
                <View pointerEvents="none" style={{ position: "absolute", top: 70, left: "50%", width: 0, height: 0 }}>
                  {CONFETTI.map((c, i) => (
                    <Animated.View
                      key={i}
                      style={{
                        position: "absolute",
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: c.color,
                        opacity: burst.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
                        transform: [
                          { translateX: Animated.multiply(burst, c.dx * 90) },
                          { translateY: Animated.multiply(burst, c.dy * 90) },
                          { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                        ],
                      }}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}
