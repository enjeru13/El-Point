import { AppLogo } from "@/components/ui/AppLogo";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

const PERKS: { icon: string; title: string; body: string }[] = [
  { icon: "heart", title: "Tus favoritos", body: "Guarda los locales que te gustan y encuéntralos rápido." },
  { icon: "fire", title: "Tus ranks y tu nivel", body: "Califica, sube fotos y gana XP por ayudar a otros." },
  { icon: "message-circle", title: "Comunidad", body: "Pide recomendaciones, vota en encuestas y conversa." },
  { icon: "bell-outline", title: "Avisos", body: "Respuestas, menciones y el plato del día de tus favoritos." },
];

/**
 * La pestaña Perfil de quien explora sin cuenta: en vez de una pantalla vacía,
 * qué gana al crearla. El resto de la app sigue abierto.
 */
export function GuestProfile() {
  const { C } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScreenHeader left={<AppLogo />} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 20 }}>
        <View
          style={{
            alignItems: "center",
            gap: 12,
            padding: 24,
            borderRadius: 28,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.primaryFixed, alignItems: "center", justifyContent: "center" }}>
            <Icon name="account" size={36} color={C.primary} />
          </View>
          <AppText variant="title" align="center">
            Estás explorando sin cuenta
          </AppText>
          <AppText variant="body" color={C.onSurfaceVariant} align="center">
            Puedes ver locales, menús y Comunidad. Crea tu cuenta, gratis, para guardar y participar.
          </AppText>
          <View style={{ alignSelf: "stretch", gap: 8, marginTop: 4 }}>
            <Button label="Crear cuenta" onPress={() => router.push("/(auth)/register")} iconTrailing="arrow-right" />
            <Button label="Ya tengo cuenta" onPress={() => router.push("/(auth)/login")} variant="secondary" />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <AppText variant="overline" color={C.outline} style={{ paddingHorizontal: 4 }}>
            CON TU CUENTA
          </AppText>
          {PERKS.map((p) => (
            <View
              key={p.title}
              style={{ flexDirection: "row", gap: 14, padding: 16, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryFixed, alignItems: "center", justifyContent: "center" }}>
                <Icon name={p.icon} size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyStrong">{p.title}</AppText>
                <AppText variant="bodySm" color={C.onSurfaceVariant}>
                  {p.body}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        <View style={{ alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => router.push("/(auth)/register-owner")} hitSlop={8}>
            <AppText variant="bodyStrong" color={C.primary}>
              ¿Tienes un local? Regístralo
            </AppText>
          </Pressable>
          <Pressable onPress={() => router.push("/legal/terms")} hitSlop={8}>
            <AppText variant="caption" color={C.outline} style={{ textDecorationLine: "underline" }}>
              Términos y privacidad
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
