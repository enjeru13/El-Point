import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { copyToClipboard } from "@/lib/clipboard";
import { ONBOARDING_KEY } from "@/lib/onboarding";
import { useMyProfile } from "@/lib/queries/me";
import { QA_MODE } from "@/lib/qa";
import { queryClient } from "@/lib/query";
import { capWidth, FORM_MAX_W, useIsTablet } from "@/lib/responsive";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { resetAllTours } from "@/lib/tour";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function supabaseHost(): string {
  try {
    return new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").host || "—";
  } catch {
    return "—";
  }
}

function ActionRow({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: string;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  const { C } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 14 }}
    >
      <Icon name={icon} size={20} color={C.primary} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color={C.onSurfaceVariant}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron-right" size={18} color={C.outline} />
    </Pressable>
  );
}

function RowDivider() {
  const { C } = useTheme();
  return <View style={{ height: 1, backgroundColor: C.outlineVariant, marginHorizontal: 18 }} />;
}

export default function QaScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isTablet = useIsTablet();
  const toast = useToast();
  const profileQ = useMyProfile();

  // El build de producción no debe exponer esta pantalla ni por deep link.
  if (!QA_MODE) return null;

  const profile = profileQ.data;
  const info: [string, string][] = [
    ["Versión", `${Constants.expoConfig?.version ?? "—"}`],
    ["Modo", __DEV__ ? "Desarrollo (dev client)" : "QA (build preview)"],
    ["Plataforma", `${Platform.OS} ${Platform.Version}`],
    ["Dispositivo", Device.modelName ?? "—"],
    ["Servidor", supabaseHost()],
    ["Usuario", profile?.username ? `@${profile.username}` : "—"],
    ["Rol", profile?.role ?? "—"],
    ["ID", profile?.id ?? "—"],
  ];

  async function copyDiagnostics() {
    const text = ["El Point · diagnóstico", ...info.map(([k, v]) => `${k}: ${v}`)].join("\n");
    const ok = await copyToClipboard(text);
    if (ok) toast.success("Diagnóstico copiado");
    else toast.error("No se pudo copiar (falta el módulo nativo en este build)");
  }

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
          Herramientas QA
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 40, ...capWidth(isTablet, FORM_MAX_W) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, padding: 18, gap: 10, ...shadow.sm }}>
          <AppText variant="bodyStrong">Este build</AppText>
          {info.map(([k, v]) => (
            <View key={k} style={{ flexDirection: "row", gap: 12 }}>
              <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ width: 92 }}>
                {k}
              </AppText>
              <AppText variant="bodySm" style={{ flex: 1 }} selectable>
                {v}
              </AppText>
            </View>
          ))}
        </View>

        <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden", ...shadow.sm }}>
          <ActionRow
            icon="content-copy"
            label="Copiar diagnóstico"
            hint="Versión, dispositivo y usuario, para pegar en un reporte"
            onPress={copyDiagnostics}
          />
          <RowDivider />
          <ActionRow
            icon="restart"
            label="Repetir onboarding"
            hint="Vuelve a mostrar la introducción de bienvenida"
            onPress={async () => {
              await SecureStore.deleteItemAsync(ONBOARDING_KEY);
              router.replace("/onboarding");
            }}
          />
          <RowDivider />
          <ActionRow
            icon="map-marker-path"
            label="Repetir tours guiados"
            hint="Reactiva las guías de cada pantalla"
            onPress={async () => {
              await resetAllTours();
              toast.success("Tours reiniciados");
            }}
          />
          <RowDivider />
          <ActionRow
            icon="cached"
            label="Limpiar caché de datos"
            hint="Descarta lo guardado y vuelve a pedirlo al servidor"
            onPress={() => {
              queryClient.clear();
              queryClient.invalidateQueries();
              toast.success("Caché limpia");
            }}
          />
          <RowDivider />
          <ActionRow
            icon="cellphone-play"
            label="Ver splash"
            hint="Simulación de la splash nativa y la splash JS"
            onPress={() => router.push("/splash-preview" as any)}
          />
        </View>
      </ScrollView>
    </View>
  );
}
