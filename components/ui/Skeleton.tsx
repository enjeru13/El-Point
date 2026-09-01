import { useTheme } from "@/lib/ThemeContext";
import { useEffect, useRef } from "react";
import type { DimensionValue, ViewStyle } from "react-native";
import { Animated, Easing, View } from "react-native";

/** Single pulsing placeholder block. */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const { C } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: C.surfaceContainerHighest,
        opacity: pulse,
        ...style,
      }}
    />
  );
}

/** Feed / review card placeholder. */
export function ReviewCardSkeleton() {
  const { C, shadow } = useTheme();
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: C.border,
        overflow: "hidden",
        marginBottom: 16,
        ...shadow.sm,
      }}
    >
      <Skeleton height={160} radius={0} />
      <View style={{ padding: 16, gap: 12 }}>
        <Skeleton width="70%" height={20} />
        <Skeleton height={56} radius={12} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingTop: 10,
          }}
        >
          <Skeleton width={36} height={36} radius={18} />
          <View style={{ gap: 6 }}>
            <Skeleton width={120} height={13} />
            <Skeleton width={80} height={11} />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Compact list-row placeholder (favorites, search results). */
export function ListRowSkeleton() {
  const { C, shadow } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 18,
        backgroundColor: C.surface,
        borderWidth: 2,
        borderColor: C.border,
        marginBottom: 10,
        ...shadow.sm,
      }}
    >
      <Skeleton width={48} height={48} radius={12} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="60%" height={15} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={32} height={16} radius={99} />
    </View>
  );
}

/** N stacked skeletons of a given kind. */
export function SkeletonList({
  count = 3,
  kind = "card",
}: {
  count?: number;
  kind?: "card" | "row";
}) {
  const Item = kind === "card" ? ReviewCardSkeleton : ListRowSkeleton;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} />
      ))}
    </>
  );
}
