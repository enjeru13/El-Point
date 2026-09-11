import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useMyProfile } from "@/lib/queries/me";
import { useSendSupportMessage } from "@/lib/queries/support";
import { AppText } from "@/components/ui/AppText";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { capWidth, FORM_MAX_W, useIsTablet } from "@/lib/responsive";

export default function SupportScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();
  const send = useSendSupportMessage();
  const profileQ = useMyProfile();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");

  const canSend = subject.trim().length >= 3 && body.trim().length >= 10;

  function submit() {
    if (!canSend) return;
    send.mutate(
      { subject, body, email: email || undefined },
      {
        onSuccess: () => {
          toast.success("Mensaje enviado. Te responderemos pronto.");
          router.back();
        },
        onError: (e: any) =>
          toast.error(e?.message ?? "No se pudo enviar. Intenta de nuevo."),
      },
    );
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
          Contacto y soporte
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 40, ...capWidth(isTablet, FORM_MAX_W) }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            padding: 16,
            borderRadius: 18,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            ...shadow.sm,
          }}
        >
          <Icon name="comment-text" size={20} color={C.primary} />
          <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ flex: 1, lineHeight: 20 }}>
            ¿Un error, una idea, un local que reportar? Escríbenos y te
            respondemos al correo{profileQ.data?.username ? ` de @${profileQ.data.username}` : ""}.
          </AppText>
        </View>

        <View style={{ gap: 8 }}>
          <AppText variant="bodyStrong">Asunto</AppText>
          <Field
            value={subject}
            onChangeText={(t) => setSubject(t.slice(0, 120))}
            placeholder="Ej. No puedo subir fotos a mi reseña"
          />
        </View>

        <View style={{ gap: 8 }}>
          <AppText variant="bodyStrong">Mensaje</AppText>
          <AppTextInput
            value={body}
            onChangeText={(t) => setBody(t.slice(0, 2000))}
            placeholder="Cuéntanos con detalle qué pasó o qué te gustaría…"
            multiline
            style={{ minHeight: 120, textAlignVertical: "top" }}
          />
          <AppText variant="caption" color={C.outline} align="right">
            {body.length}/2000
          </AppText>
        </View>

        <View style={{ gap: 8 }}>
          <AppText variant="bodyStrong">Correo de respuesta (opcional)</AppText>
          <Field
            value={email}
            onChangeText={setEmail}
            placeholder="Si es distinto al de tu cuenta"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Button
          label={send.isPending ? "Enviando…" : "Enviar"}
          onPress={submit}
          disabled={!canSend}
          loading={send.isPending}
          icon="reply"
        />
      </ScrollView>
    </View>
  );
}
