import { AppLogo } from "@/components/ui/AppLogo";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/toast";
import { Field } from "@/components/ui/Field";
import { supabase } from "@/lib/supabase";
import { signInWithGoogle } from "@/lib/oauth";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthBackground } from "@/components/ui/AuthBackground";
import { FORM_MAX_W, useIsTablet } from "@/lib/responsive";

export default function LoginScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isTablet = useIsTablet();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const toast = useToast();

  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.includes("Invalid login")
          ? "Correo o contraseña incorrectos."
          : error.message,
      );
    }
    // _layout.tsx detecta session y redirige automáticamente
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e?.message !== "CANCELLED") {
        toast.error(e?.message ?? "No se pudo iniciar sesión con Google");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <AuthBackground seed={11} />

      <KeyboardAvoidingView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
        }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <AppLogo size="lg" variant="dark" />
          <AppText
            variant="overline"
            color="rgba(255,255,255,0.9)"
            style={{ letterSpacing: 2, marginTop: 4 }}
          >
            Donde está el sabor.
          </AppText>
        </View>

        {/* Card */}
        <Animated.View
          style={{
            width: "100%",
            maxWidth: isTablet ? FORM_MAX_W : undefined,
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          }}
        >
          <View
            style={{
              borderRadius: 28,
              padding: 24,
              gap: 20,
              backgroundColor: C.surfaceContainerHigh,
              borderWidth: 1,
              borderColor: C.border,
              ...shadow.md,
            }}
          >
            <Field
              label="Correo electrónico"
              icon="email-outline"
              placeholder="hambriento@elpoint.app"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Field
              label="Contraseña"
              icon="lock-outline"
              placeholder="••••••••"
              secure
              value={password}
              onChangeText={setPassword}
            />

            <Pressable
              onPress={() => router.push("/(auth)/forgot-password")}
              style={{ alignSelf: "flex-end", marginTop: -8 }}
              hitSlop={8}
            >
              <AppText variant="bodyStrong" color={C.primary}>
                ¿Olvidaste tu contraseña?
              </AppText>
            </Pressable>

            <Button
              label={loading ? "Ingresando…" : "Ingresar"}
              onPress={handleLogin}
              loading={loading}
              iconTrailing="arrow-right"
            />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: C.outlineVariant }} />
              <AppText variant="overline" color={C.outline}>
                O CONTINÚA CON
              </AppText>
              <View style={{ flex: 1, height: 1, backgroundColor: C.outlineVariant }} />
            </View>

            <Button
              label={googleLoading ? "Conectando…" : "Continuar con Google"}
              onPress={handleGoogleLogin}
              loading={googleLoading}
              variant="secondary"
              icon="google"
            />

            <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
              <AppText variant="body" color={C.onSurfaceVariant}>
                ¿No tienes cuenta?
              </AppText>
              <Pressable onPress={() => router.push("/(auth)/register")} hitSlop={8}>
                <AppText variant="bodyStrong" color={C.primary}>
                  Regístrate
                </AppText>
              </Pressable>
            </View>

            <AppText variant="caption" color={C.outline} align="center" style={{ lineHeight: 16 }}>
              <AppText
                variant="caption"
                color={C.outline}
                style={{ textDecorationLine: "underline" }}
                onPress={() => router.push("/legal/terms")}
              >
                Términos
              </AppText>
              {"   ·   "}
              <AppText
                variant="caption"
                color={C.outline}
                style={{ textDecorationLine: "underline" }}
                onPress={() => router.push("/legal/privacy")}
              >
                Privacidad
              </AppText>
            </AppText>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
