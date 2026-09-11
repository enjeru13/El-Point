import { AppLogo } from "@/components/ui/AppLogo";
import { AppText } from "@/components/ui/AppText";
import { AuthBackground } from "@/components/ui/AuthBackground";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/toast";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FORM_MAX_W, useIsTablet } from "@/lib/responsive";

const emailValid = (e: string) =>
  /^[\x00-\x7F]+@[\x00-\x7F]+\.[\x00-\x7F]{2,}$/.test(e.trim());

export default function ForgotPasswordScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    if (!emailValid(email)) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStep("code");
  }

  async function submitNewPassword() {
    if (code.trim().length < 6) {
      toast.error("Código incompleto");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "recovery",
    });
    if (otpError) {
      setLoading(false);
      toast.error(`Código inválido: ${otpError.message}`);
      return;
    }

    const { error: updError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updError) {
      toast.error(updError.message);
      return;
    }
    // Ya se verificó el código y quedó una sesión válida con la contraseña
    // nueva — dejarlo entrar directo en vez de forzar un segundo login.
    // El layout raíz detecta la sesión y redirige solo a su home.
    toast.success("Contraseña actualizada");
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <AuthBackground seed={4} />

      <Pressable
        onPress={() => (step === "code" ? setStep("email") : router.back())}
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 12,
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <Icon name="arrow-left" size={24} color="#fff" />
      </Pressable>

      <KeyboardAvoidingView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
        }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <AppLogo size="lg" variant="dark" />
          <AppText variant="subtitle" color="rgba(255,255,255,0.9)" style={{ marginTop: 6 }}>
            {step === "email" ? "Recupera tu acceso" : "Revisa tu correo"}
          </AppText>
        </View>

        <View
          style={{
            width: "100%",
            maxWidth: isTablet ? FORM_MAX_W : undefined,
            borderRadius: 32,
            padding: 24,
            gap: 18,
            backgroundColor: C.surfaceContainerHigh,
            borderWidth: 1,
            borderColor: C.border,
            ...shadow.md,
          }}
        >
          {step === "email" ? (
            <>
              <AppText variant="body" color={C.onSurfaceVariant}>
                Escribe tu correo y te enviaremos un código para crear una
                contraseña nueva.
              </AppText>
              <Field
                label="Correo electrónico"
                icon="email-outline"
                placeholder="tucorreo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <Button
                label={loading ? "Enviando…" : "Enviar código"}
                onPress={sendCode}
                disabled={!emailValid(email)}
                loading={loading}
                iconTrailing="arrow-right"
              />
            </>
          ) : (
            <>
              <AppText variant="body" color={C.onSurfaceVariant}>
                Enviamos un código a{" "}
                <AppText variant="bodyStrong" color={C.onSurface}>
                  {email.trim()}
                </AppText>
                . Pégalo aquí y elige tu nueva contraseña.
              </AppText>

              <Field
                label="Código"
                icon="shield-lock-outline"
                placeholder="123456"
                keyboardType="number-pad"
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 8))}
              />

              <Field
                label="Nueva contraseña"
                icon="lock-outline"
                placeholder="••••••••"
                secure
                value={password}
                onChangeText={setPassword}
              />

              <Field
                label="Confirmar"
                icon="lock-outline"
                placeholder="••••••••"
                secure
                value={confirm}
                onChangeText={setConfirm}
                error={confirm.length > 0 && password !== confirm ? "No coinciden." : null}
              />

              <Button
                label={loading ? "Guardando…" : "Cambiar contraseña"}
                onPress={submitNewPassword}
                disabled={code.trim().length < 6 || password.length < 8 || password !== confirm}
                loading={loading}
                icon="check"
              />

              <Button
                label="Reenviar código"
                onPress={sendCode}
                disabled={loading}
                variant="ghost"
                size="sm"
                fullWidth={false}
                style={{ alignSelf: "center" }}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
