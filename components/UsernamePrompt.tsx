import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { useMyProfile, useUpdateMyProfile } from "@/lib/queries/me";
import { resolveUsername } from "@/lib/queries/publicProfile";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/ThemeContext";
import { cleanUsernameInput, suggestUsername, usernameProblem, withSuffix } from "@/lib/username";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Availability = "checking" | "free" | "taken" | null;

/**
 * "Elige tu usuario": se muestra una sola vez a quien tiene cuenta de comensal
 * pero no tiene @usuario (las cuentas creadas con Google o Apple no lo piden al
 * registrarse). Sin usuario no se le puede mencionar en Comunidad. Viene con una
 * sugerencia a partir del nombre; al guardarlo no vuelve a aparecer.
 */
export function UsernamePrompt() {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const profileQ = useMyProfile();
  const update = useUpdateMyProfile();
  const profile = profileQ.data;
  const needs = !!session && !!profile && profile.role === "customer" && !profile.username;

  const [value, setValue] = useState("");
  const [availability, setAvailability] = useState<Availability>(null);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);
  const checkSeq = useRef(0);

  /** ¿Está libre? Sin importar mayúsculas, y el propio usuario cuenta como libre. */
  async function isFree(u: string): Promise<boolean> {
    const owner = await resolveUsername(u);
    return !owner || owner === profile?.id;
  }

  // Primera sugerencia: el nombre; si está tomado, con un número al final.
  useEffect(() => {
    if (!needs || seeded.current) return;
    seeded.current = true;
    (async () => {
      const base = suggestUsername(profile?.full_name, session?.user.email);
      let pick = base;
      for (let i = 0; i < 5 && !(await isFree(pick)); i++) {
        pick = withSuffix(base, 10 + Math.floor(Math.random() * 90));
      }
      setValue(pick);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needs]);

  // Disponibilidad mientras escribe (con una pequeña espera).
  useEffect(() => {
    setError(null);
    if (!needs || !value || usernameProblem(value)) {
      setAvailability(null);
      return;
    }
    setAvailability("checking");
    const seq = ++checkSeq.current;
    const t = setTimeout(async () => {
      const free = await isFree(value);
      if (seq === checkSeq.current) setAvailability(free ? "free" : "taken");
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, needs]);

  if (!needs) return null;

  const problem = value ? usernameProblem(value) : null;
  const canSave = !problem && availability === "free" && !update.isPending;

  function save() {
    if (!canSave) return;
    update.mutate(
      { username: value },
      { onError: (e) => setError((e as Error).message || "No pudimos guardarlo. Inténtalo de nuevo.") },
    );
  }

  const status =
    error ??
    problem ??
    (availability === "taken"
      ? "Ese usuario ya está en uso. Prueba otro."
      : availability === "free"
        ? "Disponible"
        : availability === "checking"
          ? "Revisando…"
          : null);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, gap: 18, maxWidth: 520, width: "100%", alignSelf: "center" }}
        >
          <View style={{ alignItems: "center", gap: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.primaryFixed, alignItems: "center", justifyContent: "center" }}>
              <Icon name="at-sign" size={30} color={C.primary} />
            </View>
            <AppText variant="title" align="center">
              Elige tu usuario
            </AppText>
            <AppText variant="body" color={C.onSurfaceVariant} align="center">
              Así te van a mencionar en Comunidad con @. Te dejamos una sugerencia; puedes cambiarla después en tu perfil.
            </AppText>
          </View>

          <Field
            label="Usuario"
            icon="at-sign"
            placeholder="tu_usuario"
            autoCapitalize="none"
            autoCorrect={false}
            value={value}
            onChangeText={(t) => setValue(cleanUsernameInput(t))}
            onSubmitEditing={save}
            returnKeyType="done"
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 20, marginTop: -8 }}>
            {availability === "checking" ? (
              <ActivityIndicator size="small" color={C.outline} />
            ) : availability === "free" && !error ? (
              <Icon name="check-circle" size={16} color={C.primary} />
            ) : null}
            {status ? (
              <AppText variant="caption" color={availability === "free" && !error ? C.primary : problem || error || availability === "taken" ? C.error : C.onSurfaceVariant}>
                {status}
              </AppText>
            ) : null}
          </View>

          <Button label="Guardar" onPress={save} disabled={!canSave} loading={update.isPending} iconTrailing="arrow-right" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
