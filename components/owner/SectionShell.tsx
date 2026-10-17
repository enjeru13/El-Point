import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { capWidth, useIsTablet } from "@/lib/responsive";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { ScrollViewContainer } from "react-native-reorderable-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Pantalla de una sección de "Mi local": encabezado con volver y cuerpo con scroll. */
export function SectionShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isTablet = useIsTablet();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.background }}>
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
        <View style={{ flex: 1 }}>
          <AppText variant="title">{title}</AppText>
          {!!subtitle && (
            <AppText variant="caption" color={C.outline} numberOfLines={1}>
              {subtitle}
            </AppText>
          )}
        </View>
      </View>

      <ScrollViewContainer
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 60, ...capWidth(isTablet) }}
      >
        {children}
      </ScrollViewContainer>
    </KeyboardAvoidingView>
  );
}

/** Tarjeta con título, el estilo de las secciones del perfil. */
export function SectionCard({ title, children }: { title?: string; children: ReactNode }) {
  const { C, shadow } = useTheme();
  return (
    <View
      style={{
        borderRadius: 22,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        overflow: "hidden",
        ...shadow.sm,
      }}
    >
      {!!title && (
        <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.outlineVariant }}>
          <AppText variant="bodyStrong">{title}</AppText>
        </View>
      )}
      {children}
    </View>
  );
}

/** Editar / Cancelar + Guardar al pie de una sección. */
export function EditBar({
  editing,
  saving,
  onEdit,
  onCancel,
  onSave,
}: {
  editing: boolean;
  saving?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!editing) {
    return <Button label="Editar" onPress={onEdit} icon="pencil-outline" variant="secondary" />;
  }
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Button label="Cancelar" onPress={onCancel} variant="secondary" disabled={saving} />
      </View>
      <View style={{ flex: 1 }}>
        <Button label="Guardar" onPress={onSave} loading={saving} icon="check" />
      </View>
    </View>
  );
}
