import { Tabs } from "expo-router";
import { FloatingTabBar } from "@/components/ui/FloatingTabBar";

const ICONS: Record<string, string> = {
  index: "view-dashboard-outline",
  local: "store-outline",
  analytics: "analytics",
  profile: "account",
};

export default function OwnerLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} icons={ICONS} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Resumen" }} />
      <Tabs.Screen name="local" options={{ title: "Mi local" }} />
      <Tabs.Screen name="analytics" options={{ title: "Métricas" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}
