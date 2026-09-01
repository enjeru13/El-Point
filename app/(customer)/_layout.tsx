import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/ThemeContext";
import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IconName = string;

const TAB_ICONS: Record<string, IconName> = {
  index: "home",
  map: "map-marker",
  search: "search",
  profile: "account",
  settings: "settings",
};

function TabItem({
  route,
  focused,
  onPress,
}: {
  route: any;
  focused: boolean;
  onPress: () => void;
}) {
  const { C } = useTheme();
  const scale = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  const iconName = TAB_ICONS[route.name] ?? "circle";

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 200,
    }).start();
  }, [focused]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        width: 56,
        height: 40,
        borderRadius: 20,
        backgroundColor: focused
          ? C.primaryFixed
          : pressed
            ? C.surfaceContainerHigh
            : "transparent",
        borderWidth: focused ? 2 : 0,
        borderColor: focused ? C.border : "transparent",
      })}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon
          name={iconName}
          size={24}
          color={focused ? C.primary : C.outline}
          fill={focused ? C.primaryFixed : "none"}
        />
      </Animated.View>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: insets.bottom,
        left: 40,
        right: 40,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: C.surface,
          borderRadius: 32,
          borderWidth: 2,
          borderColor: C.border,
          paddingVertical: 14,
          paddingHorizontal: 8,
          alignItems: "center",
          justifyContent: "space-around",
          ...shadow.md,
        }}
      >
        {state.routes.map((route: BottomTabBarProps["state"]["routes"][number], i: number) => (
          <TabItem
            key={route.key}
            route={route}
            focused={state.index === i}
            onPress={() => navigation.navigate(route.name)}
          />
        ))}
      </View>
    </View>
  );
}

export default function CustomerLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="map" options={{ title: "Mapa" }} />
      <Tabs.Screen name="search" options={{ title: "Explorar" }} />
      <Tabs.Screen name="profile" options={{ title: "Mi Perfil" }} />
      <Tabs.Screen name="settings" options={{ title: "Ajustes" }} />
    </Tabs>
  );
}
