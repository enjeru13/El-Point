import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function DonateScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: C.background,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
          }}
        >
          <Icon name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1 }}>
          Apoya el proyecto
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", gap: 14, paddingTop: 12 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 32,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: C.primaryFixed,
              borderWidth: 1,
              borderColor: C.border,
              ...shadow.md,
            }}
          >
            <Icon name="heart" size={46} color={C.primary} fill={C.primary} />
          </View>
          <AppText variant="title" align="center" style={{ fontSize: 22, lineHeight: 27 }}>
            El Point es gratis y sin publicidad
          </AppText>
        </View>

        <View
          style={{
            padding: 18,
            borderRadius: 20,
            gap: 12,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            ...shadow.sm,
          }}
        >
          <AppText variant="body" color={C.onSurfaceVariant} style={{ lineHeight: 22 }}>
            Lo hacemos entre pocos, desde San Cristóbal, en nuestro tiempo
            libre. Servidores, mapas y correos tienen un costo que hoy sale de
            nuestro bolsillo.
          </AppText>
          <AppText variant="body" color={C.onSurfaceVariant} style={{ lineHeight: 22 }}>
            Si El Point te sirve y quieres ayudar a que siga creciendo, muy
            pronto habilitaremos formas de aportar. Mientras tanto, lo que más
            nos ayuda es que uses la app, dejes tus ranks y la recomiendes.
          </AppText>
        </View>

        <View
          style={{
            padding: 18,
            borderRadius: 20,
            gap: 10,
            backgroundColor: C.primary + "12",
            borderWidth: 1,
            borderColor: C.primary + "33",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="star" size={16} color={C.primary} />
            <AppText variant="bodyStrong" color={C.primary}>
              Formas de apoyar hoy
            </AppText>
          </View>
          {[
            "Deja ranks honestos y con fotos.",
            "Reporta locales que ya no existen o datos falsos.",
            "Recomienda El Point a tus panas.",
          ].map((t) => (
            <View key={t} style={{ flexDirection: "row", gap: 8 }}>
              <AppText variant="bodySm" color={C.primary}>
                •
              </AppText>
              <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ flex: 1, lineHeight: 20 }}>
                {t}
              </AppText>
            </View>
          ))}
        </View>

        <Button
          label="Escríbenos"
          onPress={() => router.replace("/support")}
          variant="secondary"
          icon="comment-text"
        />
      </ScrollView>
    </View>
  );
}
