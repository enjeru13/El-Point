import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { GATE_COPY, type GateReason } from "@/lib/guestAccess";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Gate = {
  /**
   * Devuelve `true` si hay sesión y se puede seguir. Si es un visitante, abre la
   * hoja "Crea tu cuenta para…" y devuelve `false`.
   *
   *   onPress={() => { if (!requireAuth("favorite")) return; toggleFavorite(); }}
   */
  requireAuth: (reason: GateReason) => boolean;
};

const GateContext = createContext<Gate>({ requireAuth: () => true });

export function useAuthGate(): Gate {
  return useContext(GateContext);
}

/**
 * Hoja que invita a crear la cuenta justo cuando el visitante intenta algo que
 * la necesita (favorito, rank, publicar…). Va dentro del Stack para poder navegar.
 */
export function AuthGateProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const [reason, setReason] = useState<GateReason | null>(null);

  const requireAuth = useCallback(
    (r: GateReason) => {
      if (session) return true;
      setReason(r);
      return false;
    },
    [session],
  );
  const value = useMemo(() => ({ requireAuth }), [requireAuth]);

  function go(path: "/(auth)/register" | "/(auth)/login") {
    setReason(null);
    router.push(path);
  }

  return (
    <GateContext.Provider value={value}>
      {children}
      <GateSheet reason={reason} onClose={() => setReason(null)} onRegister={() => go("/(auth)/register")} onLogin={() => go("/(auth)/login")} />
    </GateContext.Provider>
  );
}

function GateSheet({
  reason,
  onClose,
  onRegister,
  onLogin,
}: {
  reason: GateReason | null;
  onClose: () => void;
  onRegister: () => void;
  onLogin: () => void;
}) {
  const { C } = useTheme();
  const insets = useSafeAreaInsets();
  const copy = GATE_COPY[reason ?? "generic"];

  return (
    <Modal visible={reason !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Cerrar"
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        {/* El toque dentro de la hoja no la cierra. */}
        <Pressable
          onPress={() => {}}
          accessible={false}
          style={{
            backgroundColor: C.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: insets.bottom + 20,
            gap: 14,
            alignItems: "center",
            width: "100%",
            maxWidth: 560,
            alignSelf: "center",
          }}
        >
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.outlineVariant, marginBottom: 6 }} />
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.primaryFixed, alignItems: "center", justifyContent: "center" }}>
            <Icon name={copy.icon} size={30} color={C.primary} />
          </View>
          <AppText variant="title" align="center">
            {copy.title}
          </AppText>
          <AppText variant="body" color={C.onSurfaceVariant} align="center">
            {copy.body}
          </AppText>
          <View style={{ alignSelf: "stretch", gap: 8, marginTop: 6 }}>
            <Button label="Crear cuenta" onPress={onRegister} iconTrailing="arrow-right" />
            <Button label="Ya tengo cuenta" onPress={onLogin} variant="secondary" />
            <Pressable onPress={onClose} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 8 }}>
              <AppText variant="bodyStrong" color={C.onSurfaceVariant}>
                Ahora no
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
