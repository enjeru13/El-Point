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
const CYCLE_DELAYS = [60, 60, 70, 80, 100, 130, 170, 220, 290, 380];

/** "¿Qué comer hoy?" reveal — cycles through real candidates like a slot
 *  machine, decelerating into the actual pick, then pops it in. Lives
 *  outside any one screen's layout on purpose (it's a decision tool, not
 *  a list). */
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
  const scale = useRef(new Animated.Value(0.9)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (!visible || !result || pool.length === 0) {
      setDisplay(null);
      setSettled(false);
      return;
    }

    setSettled(false);
    scale.setValue(0.9);
    shimmer.setValue(0);

    let elapsed = 0;
    CYCLE_DELAYS.forEach((delay, i) => {
      elapsed += delay;
      const isLast = i === CYCLE_DELAYS.length - 1;
      const t = setTimeout(() => {
        setDisplay(isLast ? result : pool[Math.floor(Math.random() * pool.length)] ?? result);
        if (isLast) {
          setSettled(true);
          notify("success");
          Animated.parallel([
            Animated.sequence([
              Animated.timing(scale, { toValue: 1.08, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
            ]),
            Animated.timing(shimmer, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]).start();
        } else {
          impact("light");
        }
      }, elapsed);
      timers.current.push(t);
    });

    return () => timers.current.forEach(clearTimeout);
  }, [visible, result, pool]);

  const item = display;

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
            ...shadow.lg,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10} style={{ alignSelf: "flex-end", marginBottom: -12 }}>
            <Icon name="close" size={20} color={C.outline} />
          </Pressable>

          {!item ? (
            <View style={{ alignItems: "center", gap: 14, paddingVertical: 28 }}>
              <Icon name="dice-multiple-outline" size={40} color={C.primary} />
              <AppText variant="bodyStrong" align="center">Pensando qué se te antoja…</AppText>
            </View>
          ) : (
            <Animated.View style={{ gap: 16, transform: [{ scale }] }}>
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
                  <Image source={{ uri: item.cover_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={settled ? 0 : 60} />
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
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}
