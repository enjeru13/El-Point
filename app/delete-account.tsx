import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CONFIRM_WORD = "ELIMINAR";

export default function DeleteAccountScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("delete-account", {
      method: "POST",
    });
    if (error || (data as any)?.error) {
      setLoading(false);
      toast.error((data as any)?.error ?? "No se pudo eliminar la cuenta. Intenta de nuevo.");
      return;
    }
    await supabase.auth.signOut();
    setLoading(false);
    toast.success("Tu cuenta fue eliminada.");
    // app/_layout.tsx detecta que ya no hay sesión y redirige al login.
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 2,
          borderBottomColor: C.border,
          backgroundColor: C.surface,
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
            borderWidth: 2,
            borderColor: C.border,
            backgroundColor: C.surface,
            ...shadow.sm,
          }}
        >
          <Icon name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1 }}>
          Eliminar cuenta
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            backgroundColor: C.error + "22",
            borderRadius: 20,
            padding: 18,
            gap: 10,
            borderWidth: 2,
            borderColor: C.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="close-circle" size={20} color={C.error} />
            <AppText variant="bodyStrong" color={C.error}>
              Esto no se puede deshacer
            </AppText>
          </View>
          <AppText variant="bodySm" color={C.onSurfaceVariant}>
            Al eliminar tu cuenta se borran para siempre:
          </AppText>
          <View style={{ gap: 4 }}>
            {[
              "Tu perfil, nivel y XP",
              "Tus reseñas, fotos y calificaciones",
              "Tus favoritos y tu perfil de sabor",
              "Tus notificaciones",
            ].map((t) => (
              <AppText key={t} variant="bodySm" color={C.onSurfaceVariant}>
                • {t}
              </AppText>
            ))}
          </View>
          <AppText variant="caption" color={C.outline} style={{ marginTop: 4 }}>
            Si tienes un local registrado, el perfil del restaurante se mantiene visible
            para los comensales, pero queda sin dueño asignado.
          </AppText>
        </View>

        <View style={{ gap: 8 }}>
          <AppText variant="bodyStrong">
            Escribe {CONFIRM_WORD} para confirmar
          </AppText>
          <Field
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={CONFIRM_WORD}
            autoCapitalize="characters"
          />
        </View>

        <Button
          label={loading ? "Eliminando…" : "Eliminar mi cuenta para siempre"}
          onPress={handleDelete}
          disabled={!canDelete}
          loading={loading}
          variant="danger"
          icon="delete-outline"
        />
      </ScrollView>
    </View>
  );
}
