import { Tabs } from "expo-router";
import { FloatingTabBar } from "@/components/ui/FloatingTabBar";
import { UsernamePrompt } from "@/components/UsernamePrompt";

const ICONS: Record<string, string> = {
  index: "home",
  map: "map-marker",
  community: "comment-text-multiple",
  search: "search",
  profile: "account",
};

export default function CustomerLayout() {
  return (
    <>
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} icons={ICONS} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="map" options={{ title: "Mapa" }} />
      <Tabs.Screen name="community" options={{ title: "Comunidad" }} />
      <Tabs.Screen name="search" options={{ title: "Explorar" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
    {/* Cuentas de Google o Apple sin @usuario: lo eligen una vez. */}
    <UsernamePrompt />
    </>
  );
}
