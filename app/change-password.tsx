import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChangePasswordScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 &&
    next.length >= 8 &&
    next === confirm &&
    next !== current &&
    !loading;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) {
      setLoading(false);
      toast.error("No pudimos verificar tu sesión. Inicia sesión de nuevo.");
      return;
    }

    // Verificar la contraseña actual reautenticando.
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInErr) {
      setLoading(false);
      toast.error("La contraseña actual no es correcta.");
      return;
    }

    const { error: updErr } = await supabase.auth.updateUser({ password: next });
    setLoading(false);

    if (updErr) {
      toast.error(updErr.message);
      return;
    }
    toast.success("Contraseña actualizada.");
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      {/* Header */}
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
          Cambiar contraseña
        </AppText>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          <AppText variant="body" color={C.onSurfaceVariant}>
            Escribe tu contraseña actual y elige una nueva de al menos 8
            caracteres.
          </AppText>

          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 24,
              padding: 20,
              gap: 16,
              borderWidth: 2,
              borderColor: C.border,
              ...shadow.sm,
            }}
          >
            <Field
              label="Contraseña actual"
              icon="lock-outline"
              placeholder="••••••••"
              secure
              value={current}
              onChangeText={setCurrent}
            />
            <Field
              label="Nueva contraseña"
              icon="lock-outline"
              placeholder="••••••••"
              secure
              value={next}
              onChangeText={setNext}
              error={
                next.length > 0 && next.length < 8
                  ? "Mínimo 8 caracteres."
                  : next.length >= 8 && next === current
                    ? "Debe ser distinta a la actual."
                    : null
              }
            />
            <Field
              label="Confirmar nueva"
              icon="lock-outline"
              placeholder="••••••••"
              secure
              value={confirm}
              onChangeText={setConfirm}
              error={mismatch ? "No coinciden." : null}
            />

            <Button
              label={loading ? "Guardando…" : "Guardar contraseña"}
              onPress={submit}
              disabled={!canSubmit}
              loading={loading}
              icon="check"
            />
          </View>

          <Button
            label="Olvidé mi contraseña"
            onPress={() => router.replace("/(auth)/forgot-password")}
            variant="ghost"
            size="sm"
            fullWidth={false}
            style={{ alignSelf: "center" }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
