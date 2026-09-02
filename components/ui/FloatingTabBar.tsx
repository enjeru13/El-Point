import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { impact } from "@/lib/haptics";
import { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Shared neo-brutalist floating tab bar. The active tab expands into a
 * labelled pill with a hard primary shadow; the rest stay icon-only.
 */
function TabItem({
  label,
  icon,
  focused,
  onPress,
}: {
  label: string;
  icon: string;
  focused: boolean;
  onPress: () => void;
}) {
  const { C, shadow } = useTheme();
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      damping: 15,
      stiffness: 210,
    }).start();
  }, [focused, anim]);

  return (
    <Pressable
      onPress={() => {
        if (!focused) impact("light");
        onPress();
      }}
      onPressIn={() =>
        Animated.spring(press, {
          toValue: 0.92,
          useNativeDriver: false,
          damping: 15,
          stiffness: 300,
        }).start()
      }
      onPressOut={() =>
        Animated.spring(press, {
          toValue: 1,
          useNativeDriver: false,
          damping: 15,
          stiffness: 300,
        }).start()
      }
      hitSlop={6}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: focused ? 6 : 0,
          height: 44,
          paddingHorizontal: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [12, 16],
          }),
          borderRadius: 22,
          borderWidth: focused ? 2 : 0,
          borderColor: focused ? C.border : "transparent",
          backgroundColor: focused ? C.primaryFixed : "transparent",
          transform: [
            { scale: press },
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -2],
              }),
            },
          ],
          ...(focused ? shadow.primary : {}),
        }}
      >
        <Icon
          name={icon}
          size={24}
          color={focused ? C.primary : C.outline}
          fill={focused ? C.primaryFixed : "none"}
        />
        {focused && (
          <AppText variant="label" color={C.primary} numberOfLines={1}>
            {label}
          </AppText>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function FloatingTabBar({
  state,
  navigation,
  descriptors,
  icons,
}: BottomTabBarProps & { icons: Record<string, string> }) {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        bottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          backgroundColor: C.surface,
          borderRadius: 30,
          borderWidth: 2,
          borderColor: C.border,
          paddingVertical: 10,
          paddingHorizontal: 8,
          ...shadow.md,
        }}
      >
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.title === "string" ? options.title : route.name;
          return (
            <TabItem
              key={route.key}
              label={label}
              icon={icons[route.name] ?? "circle"}
              focused={state.index === i}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (state.index !== i && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
