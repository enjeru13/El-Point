import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBarProps, Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, shadow } from '@/lib/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_ICONS: Record<string, { default: IconName; focused: IconName }> = {
  index:     { default: 'storefront-outline',     focused: 'storefront' },
  analytics: { default: 'chart-bar',              focused: 'chart-bar' },
  settings:  { default: 'account-circle-outline', focused: 'account-circle' },
};

function TabItem({ route, focused, onPress }: { route: any; focused: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  const icons = TAB_ICONS[route.name] ?? { default: 'circle-outline', focused: 'circle' };

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
        alignItems: 'center',
        justifyContent: 'center',
        width: 56, height: 40,
        borderRadius: 20,
        backgroundColor: focused
          ? C.primaryFixed
          : pressed ? C.surfaceContainerHigh : 'transparent',
        borderWidth: focused ? 2 : 0,
        borderColor: focused ? C.border : 'transparent',
      })}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <MaterialCommunityIcons
          name={focused ? icons.focused : icons.default}
          size={27}
          color={focused ? C.primary : C.outline}
        />
      </Animated.View>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', bottom: insets.bottom, left: 40, right: 40 }}
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: C.surface,
          borderRadius: 32,
          borderWidth: 2,
          borderColor: C.border,
          paddingVertical: 14,
          paddingHorizontal: 8,
          alignItems: 'center',
          justifyContent: 'space-around',
          ...shadow.md,
        }}
      >
        {state.routes.map((route, i) => (
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

export default function OwnerLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"     options={{ title: 'Mi Local' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Estadísticas' }} />
      <Tabs.Screen name="settings"  options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
