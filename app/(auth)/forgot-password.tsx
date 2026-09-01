import { AppLogo } from "@/components/ui/AppLogo";
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
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const emailValid = (e: string) =>
  /^[\x00-\x7F]+@[\x00-\x7F]+\.[\x00-\x7F]{2,}$/.test(e.trim());

export default function ForgotPasswordScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

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
    await supabase.auth.signOut();
    setLoading(false);

    if (updError) {
      toast.error(updError.message);
      return;
    }
    toast.success("Contraseña actualizada. Inicia sesión.");
    router.replace("/(auth)/login");
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: C.primary, paddingTop: insets.top }}
    >
      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.15)",
        }}
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable
          onPress={() => (step === "code" ? setStep("email") : router.back())}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </Pressable>
      </View>

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
          <Text
            style={{
              color: "rgba(255,255,255,0.9)",
              fontFamily: "PlusJakartaSans_600SemiBold",
              fontSize: 15,
              marginTop: 6,
            }}
          >
            {step === "email" ? "Recupera tu acceso" : "Revisa tu correo"}
          </Text>
        </View>

        <View
          style={{
            width: "100%",
            borderRadius: 32,
            padding: 24,
            gap: 18,
            backgroundColor: C.surface,
            borderWidth: 2,
            borderColor: C.border,
            ...shadow.md,
          }}
        >
          {step === "email" ? (
            <>
              <Text
                style={{
                  color: C.onSurfaceVariant,
                  fontFamily: "PlusJakartaSans_400Regular",
                  fontSize: 15,
                  lineHeight: 21,
                }}
              >
                Escribe tu correo y te enviaremos un código para crear una
                contraseña nueva.
              </Text>
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
              <Text
                style={{
                  color: C.onSurfaceVariant,
                  fontFamily: "PlusJakartaSans_400Regular",
                  fontSize: 15,
                  lineHeight: 21,
                }}
              >
                Enviamos un código a{" "}
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: C.onSurface,
                  }}
                >
                  {email.trim()}
                </Text>
                . Pégalo aquí y elige tu nueva contraseña.
              </Text>

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
