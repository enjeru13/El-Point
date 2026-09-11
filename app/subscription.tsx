import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/AppText";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { useToast } from "@/lib/toast";
import { useMyRestaurant } from "@/lib/queries/owner";
import { isFounder } from "@/lib/queries/restaurants";
import {
  daysUntil,
  PAYMENT_METHODS,
  useMyPayments,
  useSubmitPayment,
  type PaymentMethod,
} from "@/lib/queries/payments";
import { capWidth, useIsTablet } from "@/lib/responsive";

const STATUS_LABEL: Record<string, string> = {
  pending: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export default function SubscriptionScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();

  const restaurantQ = useMyRestaurant();
  const r = restaurantQ.data ?? null;
  const paymentsQ = useMyPayments(r?.id);
  const submit = useSubmitPayment(r?.id);

  const [method, setMethod] = useState<PaymentMethod>("bs_bcv");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const founder = isFounder(r);
  const left = r ? daysUntil(r.paid_until) : null;
  const expired = left !== null && left < 0;

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (res.canceled) return;
    setPhotoUri(res.assets[0].uri);
  }

  function onSubmit() {
    if (!reference.trim() || !photoUri) {
      toast.error("Falta la referencia o la foto del comprobante");
      return;
    }
    submit.mutate(
      { method, reference, amount: amount ? Number(amount) : undefined, photoUri },
      {
        onSuccess: () => {
          toast.success("Comprobante enviado — lo revisamos pronto");
          setReference("");
          setAmount("");
          setPhotoUri(null);
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo enviar"),
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
            width: 40, height: 40, borderRadius: 20,
            alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
          }}
        >
          <Icon name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <AppText variant="title" style={{ flex: 1 }}>Suscripción</AppText>
      </View>

      {restaurantQ.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : !r ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="store-outline"
            title="No encontramos tu local"
            body="Puede ser un problema de conexión. Vuelve a intentarlo."
            actionLabel="Reintentar"
            onAction={() => restaurantQ.refetch()}
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 40, ...capWidth(isTablet, 640) }}
        >
          {/* Estado */}
          {founder ? (
            <View
              style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                padding: 16, borderRadius: 20,
                backgroundColor: "#f0c26022", borderWidth: 1, borderColor: "#f0c26066",
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#f0c260", alignItems: "center", justifyContent: "center" }}>
                <Icon name="crown" size={22} color="#3a2a05" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">Eres Fundador de El Point</AppText>
                <AppText variant="bodySm" color={C.onSurfaceVariant}>
                  Tu local entró entre los primeros 100 de la app.
                </AppText>
              </View>
            </View>
          ) : (
            <View
              style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                padding: 16, borderRadius: 20,
                backgroundColor: expired ? C.error + "1f" : C.surface,
                borderWidth: 1, borderColor: expired ? C.error + "55" : C.border,
                ...shadow.sm,
              }}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: expired ? C.error : C.primaryFixed,
                alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={expired ? "alert-circle-outline" : "calendar-check-outline"} size={22} color={expired ? "#fff" : C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">
                  {left === null
                    ? "Sin plan activo todavía"
                    : expired
                      ? "Tu plan venció"
                      : `${left} ${left === 1 ? "día" : "días"} restantes`}
                </AppText>
                <AppText variant="bodySm" color={C.onSurfaceVariant}>
                  {expired
                    ? "Sube tu comprobante de pago para reactivar tu local."
                    : "Al vencerse necesitás pagar la suscripción anual (10 USD) para seguir activo."}
                </AppText>
              </View>
            </View>
          )}

          {!founder && (
            <>
              {/* Cómo pagar */}
              <View style={{ gap: 10 }}>
                <AppText variant="heading" style={{ fontSize: 17 }}>Cómo pagar</AppText>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {PAYMENT_METHODS.map((m) => {
                    const active = method === m.key;
                    return (
                      <Pressable
                        key={m.key}
                        onPress={() => setMethod(m.key)}
                        style={{
                          flex: 1, alignItems: "center", gap: 6, paddingVertical: 12,
                          borderRadius: 14, borderWidth: active ? 2 : 1,
                          borderColor: active ? C.primary : C.border,
                          backgroundColor: active ? C.primaryFixed : C.surface,
                        }}
                      >
                        <Icon name={m.icon} size={20} color={active ? C.primary : C.onSurfaceVariant} />
                        <AppText variant="label" color={active ? C.primary : C.onSurfaceVariant} style={{ fontSize: 12, textAlign: "center" }}>
                          {m.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ borderRadius: 18, backgroundColor: C.surfaceContainerLow, padding: 14, gap: 4 }}>
                  {PAYMENT_METHODS.find((m) => m.key === method)!.instructions.map((line, i) => (
                    <AppText key={i} variant="bodySm" color={C.onSurfaceVariant}>{line}</AppText>
                  ))}
                </View>
              </View>

              {/* Enviar comprobante */}
              <View style={{ gap: 10 }}>
                <AppText variant="heading" style={{ fontSize: 17 }}>Enviar comprobante</AppText>
                <AppTextInput
                  value={reference}
                  onChangeText={setReference}
                  placeholder="Número de referencia / confirmación"
                />
                <AppTextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Monto (opcional)"
                  keyboardType="decimal-pad"
                />
                <Pressable
                  onPress={pickPhoto}
                  style={{
                    height: 130, borderRadius: 14, overflow: "hidden",
                    borderWidth: 1, borderColor: photoUri ? C.border : C.outlineVariant,
                    borderStyle: photoUri ? "solid" : "dashed",
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: C.surfaceContainerLow,
                  }}
                >
                  {photoUri ? (
                    <View style={{ alignItems: "center", gap: 4 }}>
                      <Icon name="check-circle" size={26} color={C.primary} />
                      <AppText variant="caption" color={C.onSurfaceVariant}>Foto lista · toca para cambiar</AppText>
                    </View>
                  ) : (
                    <View style={{ alignItems: "center", gap: 4 }}>
                      <Icon name="camera-plus-outline" size={26} color={C.primary} />
                      <AppText variant="caption" color={C.outline}>Foto del comprobante</AppText>
                    </View>
                  )}
                </Pressable>
                <Button label="Enviar" onPress={onSubmit} loading={submit.isPending} icon="send" />
              </View>

              {/* Historial */}
              {(paymentsQ.data ?? []).length > 0 && (
                <View style={{ gap: 10 }}>
                  <AppText variant="heading" style={{ fontSize: 17 }}>Historial</AppText>
                  <View style={{ gap: 8 }}>
                    {paymentsQ.data!.map((p) => (
                      <View
                        key={p.id}
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 10,
                          padding: 12, borderRadius: 14,
                          backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
                        }}
                      >
                        <Icon
                          name={PAYMENT_METHODS.find((m) => m.key === p.method)?.icon ?? "cash"}
                          size={18}
                          color={C.onSurfaceVariant}
                        />
                        <View style={{ flex: 1 }}>
                          <AppText variant="bodySm">{p.reference}</AppText>
                          {p.note && <AppText variant="caption" color={C.outline}>{p.note}</AppText>}
                        </View>
                        <AppText
                          variant="label"
                          color={p.status === "approved" ? C.primary : p.status === "rejected" ? C.error : C.outline}
                        >
                          {STATUS_LABEL[p.status]}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
