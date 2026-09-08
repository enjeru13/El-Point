import { Icon } from "@/components/ui/Icon";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, View } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

const FOOD_ICONS = [
  "hamburger",
  "pizza",
  "food-hot-dog",
  "sandwich",
  "croissant",
  "donut",
  "cookie",
  "food-steak",
  "egg-fried",
  "fish",
  "food-apple",
  "cherries",
  "carrot",
  "soup",
  "cup-soda",
  "beer",
  "glass-wine",
  "popcorn",
  "cake",
  "candy",
  "fruit-grapes",
  "fruit-citrus",
  "ham",
  "food-drumstick",
  "ice-cream",
  "ice-cream-cone",
  "coffee",
  "chef-hat",
  "salad",
  "wheat",
] as const;

// tiny seeded PRNG so the layout is stable between renders
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

type Placed = {
  key: string;
  name: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  floatY: number;
  duration: number;
  delay: number;
};

function buildLayout(seed: number): Placed[] {
  const rand = rng(seed);
  const cols = W < 380 ? 4 : 5;
  const rows = Math.max(6, Math.round((H / W) * cols));
  const cellW = W / cols;
  const cellH = H / rows;
  const out: Placed[] = [];
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // stagger alternate rows so it doesn't read as a grid
      const offset = r % 2 === 0 ? 0 : cellW * 0.5;
      const size = 30 + Math.round(rand() * 30);
      const jitterX = (rand() - 0.5) * cellW * 0.55;
      const jitterY = (rand() - 0.5) * cellH * 0.55;
      const x = c * cellW + offset + cellW * 0.5 + jitterX - size / 2;
      const y = r * cellH + cellH * 0.5 + jitterY - size / 2;
      out.push({
        key: `${r}-${c}`,
        name: FOOD_ICONS[n % FOOD_ICONS.length],
        x: Math.max(-size * 0.4, Math.min(W - size * 0.6, x)),
        y,
        size,
        rotation: (rand() - 0.5) * 80,
        opacity: 0.08 + rand() * 0.12,
        floatY: 8 + rand() * 12,
        duration: 3500 + rand() * 2200,
        delay: rand() * 2200,
      });
      n++;
    }
  }
  return out;
}

function FloatingIcon({ item, color }: { item: Placed; color: string }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -item.floatY,
          duration: item.duration,
          delay: item.delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: item.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const spinLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, {
          toValue: 1,
          duration: item.duration * 2.4,
          delay: item.delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 0,
          duration: item.duration * 2.4,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    floatLoop.start();
    spinLoop.start();
    return () => {
      floatLoop.stop();
      spinLoop.stop();
    };
  }, [item, translateY, rotate]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: item.x,
        top: item.y,
        opacity: item.opacity,
        transform: [
          { translateY },
          {
            rotate: rotate.interpolate({
              inputRange: [0, 1],
              outputRange: [`${item.rotation}deg`, `${item.rotation + 14}deg`],
            }),
          },
        ],
      }}
    >
      <Icon name={item.name} size={item.size} color={color} />
    </Animated.View>
  );
}

/**
 * Full-bleed animated food-icon field. Sits behind auth screens.
 * `seed` keeps the layout stable; pass a different one per screen for variety.
 */
export function FoodBackdrop({
  color = "#ffffff",
  seed = 7,
  opacityScale = 1,
}: {
  color?: string;
  seed?: number;
  /** Multiply every icon's opacity (dark backgrounds need more). */
  opacityScale?: number;
}) {
  const layout = useMemo(
    () =>
      buildLayout(seed).map((it) => ({
        ...it,
        opacity: Math.min(1, it.opacity * opacityScale),
      })),
    [seed, opacityScale],
  );
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
      }}
    >
      {layout.map((item) => (
        <FloatingIcon key={item.key} item={item} color={color} />
      ))}
    </View>
  );
}
