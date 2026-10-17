import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, View, KeyboardAvoidingView } from "react-native";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useMyProfile } from "@/lib/queries/me";
import { useMyRestaurant } from "@/lib/queries/owner";
import {
  SUPPORT_WHATSAPP,
  useAccountEmail,
  useMyTickets,
  useSendSupportMessage,
} from "@/lib/queries/support";
import { CUSTOMER_FAQ, OWNER_FAQ } from "@/lib/faq";
import { whatsappUrl } from "@/lib/contact";
import { AppText } from "@/components/ui/AppText";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { capWidth, FORM_MAX_W, useIsTablet } from "@/lib/responsive";

const TOPICS = [
  { key: "bug", label: "Un error en la app", icon: "bug-outline" },
  { key: "plan", label: "Mi plan", icon: "calendar-check-outline" },
  { key: "report", label: "Reportar un local", icon: "flag-outline" },
  { key: "idea", label: "Una idea", icon: "lightbulb-outline" },
  { key: "other", label: "Otro tema", icon: "comment-text-outline" },
] as const;

const DAY = 86_400_000;

function ago(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

export default function SupportScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();
  const send = useSendSupportMessage();
  const profileQ = useMyProfile();
  const restaurantQ = useMyRestaurant();
  const ticketsQ = useMyTickets();
  const emailQ = useAccountEmail();

  const params = useLocalSearchParams<{ topic?: string }>();
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["key"]>(
    TOPICS.some((t) => t.key === params.topic) ? (params.topic as (typeof TOPICS)[number]["key"]) : "bug",
  );
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [editEmail, setEditEmail] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [openQ, setOpenQ] = useState<number | null>(null);

  const profile = profileQ.data;
  const isOwner = profile?.role === "restaurant_owner";
  const restaurantName = isOwner ? restaurantQ.data?.name : undefined;
  const topicLabel = TOPICS.find((t) => t.key === topic)!.label;
  const canSend = body.trim().length >= 10;
  const faq = isOwner ? OWNER_FAQ : CUSTOMER_FAQ;
  const accountEmail = emailQ.data;

  /** Lo que nos ahorra preguntar: quién escribe y desde qué versión. */
  const context = [
    profile?.username ? `@${profile.username}` : null,
    isOwner ? "dueño" : "comensal",
    restaurantName ? `local: ${restaurantName}` : null,
    `v${Constants.expoConfig?.version ?? "?"}`,
    Platform.OS === "ios" ? "iOS" : "Android",
  ]
    .filter(Boolean)
    .join(" · ");

  function submit() {
    if (!canSend) return;
    send.mutate(
      {
        subject: topicLabel,
        body: `${body.trim()}\n\n— ${context}`,
        email: editEmail && email.trim() ? email.trim() : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Mensaje enviado. Te responderemos pronto.");
          setBody("");
          setEditEmail(false);
          setEmail("");
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo enviar. Intenta de nuevo."),
      },
    );
  }

  function openWhatsApp() {
    const text = [
      "Hola, necesito ayuda con El Point.",
      `Tema: ${topicLabel}`,
      `(${context})`,
    ].join("\n");
    const url = whatsappUrl(SUPPORT_WHATSAPP, text);
    if (url) Linking.openURL(url).catch(() => toast.error("No pudimos abrir WhatsApp"));
  }

  const tickets = ticketsQ.data ?? [];

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
        <AppText variant="title" style={{ flex: 1 }}>
          Ayuda y soporte
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 40, ...capWidth(isTablet, FORM_MAX_W) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Tema */}
        <View style={{ gap: 10 }}>
          <AppText variant="heading" style={{ fontSize: 17 }}>¿En qué te ayudamos?</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TOPICS.map((t) => (
              <Chip key={t.key} label={t.label} icon={t.icon} tone="secondary" active={topic === t.key} onPress={() => setTopic(t.key)} />
            ))}
          </View>
        </View>

        {/* WhatsApp: la vía rápida */}
        <Pressable
          onPress={openWhatsApp}
          android_ripple={{ color: C.outlineVariant }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 16,
            borderRadius: 20,
            backgroundColor: C.primaryFixed,
            borderWidth: 1,
            borderColor: C.border,
            ...shadow.sm,
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" }}>
            <Icon name="whatsapp" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">Escríbenos por WhatsApp</AppText>
            <AppText variant="bodySm" color={C.onSurfaceVariant}>La forma más rápida de que te respondamos.</AppText>
          </View>
          <Icon name="open-in-new" size={18} color={C.outline} />
        </Pressable>

        {/* Formulario */}
        <View style={{ gap: 10 }}>
          <AppText variant="heading" style={{ fontSize: 17 }}>O déjanos un mensaje</AppText>
          <AppTextInput
            value={body}
            onChangeText={(t) => setBody(t.slice(0, 1800))}
            placeholder="Cuéntanos con detalle qué pasó o qué te gustaría…"
            multiline
            style={{ minHeight: 120, textAlignVertical: "top" }}
          />
          <AppText variant="caption" color={C.outline} align="right">
            {body.length}/1800
          </AppText>

          {editEmail ? (
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="Correo donde quieres la respuesta"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="email-outline" size={16} color={C.outline} />
              <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ flex: 1 }} numberOfLines={1}>
                {accountEmail ? `Te respondemos a ${accountEmail}` : "Te respondemos al correo de tu cuenta"}
              </AppText>
              <Pressable onPress={() => setEditEmail(true)} hitSlop={8}>
                <AppText variant="label" color={C.primary}>Cambiar</AppText>
              </Pressable>
            </View>
          )}

          <Button
            label={send.isPending ? "Enviando…" : "Enviar mensaje"}
            onPress={submit}
            disabled={!canSend}
            loading={send.isPending}
            icon="send"
          />
        </View>

        {/* Mis mensajes */}
        {tickets.length > 0 && (
          <View style={{ gap: 10 }}>
            <AppText variant="heading" style={{ fontSize: 17 }}>Tus mensajes</AppText>
            <View style={{ borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
              {tickets.map((tk, i) => (
                <View
                  key={tk.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: C.outlineVariant,
                  }}
                >
                  <Icon name={tk.status === "closed" ? "check-circle" : "clock-outline"} size={18} color={tk.status === "closed" ? C.secondary : C.outline} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodySm" numberOfLines={1}>{tk.subject}</AppText>
                    <AppText variant="caption" color={C.outline}>{ago(tk.created_at)}</AppText>
                  </View>
                  <AppText variant="label" color={tk.status === "closed" ? C.secondary : C.onSurfaceVariant}>
                    {tk.status === "closed" ? "Resuelto" : "En revisión"}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Preguntas frecuentes: cerradas por defecto, para que no estorben */}
        <View style={{ borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden" }}>
          <Pressable
            onPress={() => setFaqOpen((v) => !v)}
            android_ripple={{ color: C.outlineVariant }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}
          >
            <Icon name="help-circle-outline" size={20} color={C.primary} />
            <AppText variant="bodyStrong" style={{ flex: 1 }}>Preguntas frecuentes</AppText>
            <Icon name={faqOpen ? "chevron-up" : "chevron-down"} size={18} color={C.outline} />
          </Pressable>
          {faqOpen &&
            faq.map((f, i) => {
              const open = openQ === i;
              return (
                <Pressable
                  key={f.q}
                  onPress={() => setOpenQ(open ? null : i)}
                  style={{ paddingHorizontal: 16, paddingVertical: 13, gap: 6, borderTopWidth: 1, borderTopColor: C.outlineVariant }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <AppText variant="bodySm" style={{ flex: 1, fontWeight: "600" }}>{f.q}</AppText>
                    <Icon name={open ? "minus" : "plus"} size={16} color={C.outline} />
                  </View>
                  {open && (
                    <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ lineHeight: 20 }}>
                      {f.a}
                    </AppText>
                  )}
                </Pressable>
              );
            })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
