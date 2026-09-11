import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { hasSeenTour, markTourSeen, TOUR_RESET_EVENT } from "@/lib/tour";
import { useTheme } from "@/lib/ThemeContext";
import { impact } from "@/lib/haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  Animated,
  DeviceEventEmitter,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type TourStep = {
  ref: RefObject<View | null>;
  icon: string;
  title: string;
  text: string;
};

type Rect = { x: number; y: number; width: number; height: number };

const HALO = 8;
const SIDE_MARGIN = 20;
const DIM = "rgba(12,9,7,0.62)";

/**
 * First-use guided tour for one screen: dims everything but the current
 * target, draws a pulsing ring around it, and shows a small card with
 * "Saltar" / "Siguiente". Shows once per device (see lib/tour.ts), and
 * replays instantly if resetAllTours() fires (Ajustes → Ver tutorial).
 */
export function TourGuide({
  tourKey,
  steps,
  ready = true,
  scrollRef,
  scrollOffset,
}: {
  tourKey: string;
  steps: TourStep[];
  ready?: boolean;
  /** Screen's ScrollView, if the target can sit below the fold — the tour
   *  scrolls it into view before highlighting. */
  scrollRef?: RefObject<ScrollView | null>;
  /** Ref tracking that ScrollView's current contentOffset.y (update it from
   *  the screen's own onScroll). Required alongside scrollRef to compute
   *  where to scroll to. */
  scrollOffset?: RefObject<number>;
}) {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const retriesRef = useRef(0);

  const measure = useCallback(
    (i: number) => {
      // Target not mounted yet (loading skeleton, a conditional section
      // that isn't showing right now, or just not laid out this frame) —
      // retry for a few seconds instead of leaving the tour stuck forever
      // with the dim overlay up and nothing to show.
      function notReady() {
        if (retriesRef.current < 12) {
          retriesRef.current += 1;
          setTimeout(() => measure(i), 250);
        } else {
          retriesRef.current = 0;
          setVisible(false); // not marked as seen — tries again next mount
        }
      }

      const target = steps[i]?.ref.current;
      if (!target) return notReady();

      target.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) return notReady();
        retriesRef.current = 0;

        const scroller = scrollRef?.current;
        if (!scroller) { setRect({ x, y, width, height }); return; }

        // Below/above the visible area (leaving room for the card) — scroll
        // the target toward the middle of the screen, then re-measure.
        const win = Dimensions.get("window");
        const centerY = y + height / 2;
        const safeTop = insets.top + 90;
        const safeBottom = win.height - insets.bottom - 220;

        if (centerY >= safeTop && centerY <= safeBottom) {
          setRect({ x, y, width, height });
          return;
        }

        const delta = centerY - (safeTop + safeBottom) / 2;
        const current = scrollOffset?.current ?? 0;
        scroller.scrollTo({ y: Math.max(0, current + delta), animated: true });
        setTimeout(() => {
          target.measureInWindow((x2, y2, w2, h2) => {
            if (w2 > 0 && h2 > 0) setRect({ x: x2, y: y2, width: w2, height: h2 });
          });
        }, 360);
      });
    },
    [steps, scrollRef, scrollOffset, insets],
  );

  const start = useCallback(() => {
    setRect(null);
    setStep(0);
    setVisible(true);
    requestAnimationFrame(() => measure(0));
  }, [measure]);

  useEffect(() => {
    if (!ready || steps.length === 0) return;
    let cancelled = false;
    hasSeenTour(tourKey).then((seen) => {
      if (!cancelled && !seen) setTimeout(() => !cancelled && start(), 700);
    });
    const sub = DeviceEventEmitter.addListener(TOUR_RESET_EVENT, start);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [ready, tourKey, steps.length, start]);

  useEffect(() => {
    if (!visible || !rect) return;
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [step, visible, rect]);

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  function goNext() {
    impact("light");
    if (step + 1 >= steps.length) return finish();
    const n = step + 1;
    setStep(n);
    setRect(null);
    requestAnimationFrame(() => measure(n));
  }

  function finish() {
    setVisible(false);
    markTourSeen(tourKey);
  }

  if (!visible || !rect) return null;

  const win = Dimensions.get("window");
  const s = steps[step];
  const cx = Math.max(rect.x - HALO, 0);
  const cy = Math.max(rect.y - HALO, 0);
  const cw = Math.min(rect.width + HALO * 2, win.width - cx);
  const ch = rect.height + HALO * 2;

  const cardH = 196;
  const spaceBelow = win.height - (rect.y - HALO + ch);
  const placeBelow = spaceBelow > cardH + insets.bottom + 20;
  const cardTop = placeBelow
    ? cy + ch + 14
    : Math.max(insets.top + 12, cy - cardH - 14);

  return (
    // No <Modal> on purpose: Modal opens a second native window on Android,
    // and measureInWindow()'s coordinates for that window don't reliably
    // line up with the Modal's own on some Android versions/OEMs (ring
    // renders off-target — reported on a Poco M3, fine on iOS where Modal
    // doesn't have this quirk). Rendered in-tree instead, as the last child
    // of the screen, so it's guaranteed to share the exact same coordinate
    // space as whatever we just measured. Trade-off: it won't dim/cover the
    // floating tab bar (that's a sibling from the Tabs navigator, outside
    // this screen's own tree) — a cosmetic gap, not a functional one.
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, elevation: 999, zIndex: 999 }}
    >
      <Pressable style={{ flex: 1 }} onPress={goNext} accessible={false}>
        {/* Dim everywhere except a cutout around the target (4 bars) */}
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: cy, backgroundColor: DIM }} />
        <View pointerEvents="none" style={{ position: "absolute", top: cy + ch, left: 0, right: 0, bottom: 0, backgroundColor: DIM }} />
        <View pointerEvents="none" style={{ position: "absolute", top: cy, left: 0, width: cx, height: ch, backgroundColor: DIM }} />
        <View pointerEvents="none" style={{ position: "absolute", top: cy, left: cx + cw, right: 0, height: ch, backgroundColor: DIM }} />

        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: cx,
            top: cy,
            width: cw,
            height: ch,
            borderRadius: 18,
            borderWidth: 2.5,
            borderColor: C.primary,
            transform: [{ scale: pulse }],
          }}
        />

        <Animated.View
          style={{
            position: "absolute",
            left: SIDE_MARGIN,
            right: SIDE_MARGIN,
            top: cardTop,
            opacity: fade,
            transform: [
              {
                translateY: fade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [placeBelow ? -10 : 10, 0],
                }),
              },
            ],
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: C.surface,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: C.border,
              padding: 18,
              gap: 12,
              ...shadow.lg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: C.primaryFixed,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={s.icon} size={19} color={C.primary} />
              </View>
              <AppText variant="heading" style={{ flex: 1 }}>
                {s.title}
              </AppText>
            </View>

            <AppText variant="body" color={C.onSurfaceVariant}>
              {s.text}
            </AppText>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 2,
              }}
            >
              <View style={{ flexDirection: "row", gap: 6 }}>
                {steps.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === step ? 18 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === step ? C.primary : C.outlineVariant,
                    }}
                  />
                ))}
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                <Pressable onPress={finish} hitSlop={10}>
                  <AppText variant="bodyStrong" color={C.outline}>
                    Saltar
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={goNext}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: C.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 99,
                    ...shadow.primary,
                  }}
                >
                  <AppText variant="bodyStrong" color="#fff">
                    {step + 1 === steps.length ? "Entendido" : "Siguiente"}
                  </AppText>
                  {step + 1 < steps.length && (
                    <Icon name="arrow-right" size={16} color="#fff" />
                  )}
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </View>
  );
}
