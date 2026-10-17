import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/AppText";
import { AppTextInput } from "@/components/ui/AppTextInput";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
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
import { PaymentMethodPicker } from "@/components/ui/PaymentMethodPicker";
import { PAYMENTS_IN_APP } from "@/lib/billing";
import { FREE_PERKS, PLAN_PERKS, hasPlan } from "@/lib/plan";
import { Bar, KIND_LABEL, periodDays } from "@/components/owner/ResumenCards";
import { useRestaurantStats } from "@/lib/queries/analytics";

const GOLD = "#f0c260";

const STATUS_LABEL: Record<string, string> = {
  pending: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
  voided: "Anulado",
};

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" });
}

function Bignum({ value, label, tone }: { value: number; label: string; tone?: string }) {
  const { C } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="title" color={tone ?? C.onSurface} style={{ fontSize: 30, lineHeight: 34 }}>{value}</AppText>
      <AppText variant="bodySm" color={C.onSurfaceVariant}>{label}</AppText>
    </View>
  );
}

function PerkRow({ icon, label, state }: { icon: string; label: string; state: "included" | "locked" | "always" }) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 }}>
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: state === "locked" ? C.surfaceContainerHighest : C.primaryFixed, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={16} color={state === "locked" ? C.outline : C.primary} />
      </View>
      <AppText variant="bodySm" color={state === "locked" ? C.onSurfaceVariant : C.onSurface} style={{ flex: 1 }}>{label}</AppText>
      <Icon
        name={state === "locked" ? "lock-outline" : "check-circle"}
        size={16}
        color={state === "locked" ? C.outline : state === "included" ? C.secondary : C.outline}
      />
    </View>
  );
}

export default function SubscriptionScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const isTablet = useIsTablet();

  const restaurantQ = useMyRestaurant();
  const r = restaurantQ.data ?? null;
  const statsQ = useRestaurantStats(r?.id, 30);
  const paymentsQ = useMyPayments(r?.id);
  const [refreshing, setRefreshing] = useState(false);
  const submit = useSubmitPayment(r?.id);

  const [method, setMethod] = useState<PaymentMethod>("bs_bcv");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const founder = isFounder(r);
  const left = r ? daysUntil(r.paid_until) : null;
  const expired = left !== null && left < 0;
  const plan = hasPlan(r);
  const ending = plan && !founder && left !== null && left <= 7;
  const planColor = founder ? GOLD : !plan ? C.error : ending ? "#d99a1c" : C.secondary;
  const stats = statsQ.data;
  const contacts = stats ? stats.whatsapp + stats.call + stats.instagram + stats.order : 0;

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([restaurantQ.refetch(), statsQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  function pickPhoto() {
    Alert.alert("Agregar foto", undefined, [
      {
        text: "Tomar foto",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { toast.error("Permiso de cámara denegado"); return; }
          const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85 });
          if (!res.canceled) setPhotoUri(res.assets[0].uri);
        },
      },
      {
        text: "Elegir de galería",
        onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
          if (!res.canceled) setPhotoUri(res.assets[0].uri);
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
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
        <AppText variant="title" style={{ flex: 1 }}>Mi plan</AppText>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
          contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 40, ...capWidth(isTablet, 640) }}
        >
          {/* Estado */}
          <View style={{ padding: 18, gap: 12, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: plan ? C.border : C.error + "55", ...shadow.sm }}>
            {founder ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="crown" size={22} color="#3a2a05" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">Original #{r.founder_rank}</AppText>
                  <AppText variant="bodySm" color={C.onSurfaceVariant}>
                    Entraste entre los primeros 100 locales. Tu perfil completo es gratis para siempre.
                  </AppText>
                </View>
              </View>
            ) : plan && left !== null ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                  <AppText variant="bodyStrong">{(r.plan_kind && KIND_LABEL[r.plan_kind]) || "Plan activo"}</AppText>
                  <AppText variant="title" color={planColor} style={{ fontSize: 22 }}>
                    {Math.max(left, 0)} {left === 1 ? "día" : "días"}
                  </AppText>
                </View>
                <Bar pct={left / periodDays(r, left)} color={planColor} />
                <AppText variant="bodySm" color={C.onSurfaceVariant}>
                  {ending ? "Vence pronto · " : ""}Activo hasta el {longDate(r.paid_until!)}.
                  {r.plan_kind === "trial" ? " Al terminar la prueba, tu perfil pasa a básico." : ""}
                </AppText>
              </>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.error, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={expired ? "alert-circle-outline" : "lock-outline"} size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{expired ? "Tu plan venció" : "Perfil básico"}</AppText>
                  <AppText variant="bodySm" color={C.onSurfaceVariant}>
                    {PAYMENTS_IN_APP
                      ? "Sube tu comprobante de pago para reactivar tu local."
                      : "Tu local sigue en el mapa, pero sin contacto, menú ni fotos para los comensales."}
                  </AppText>
                </View>
              </View>
            )}
          </View>

          {/* Lo que has conseguido */}
          {stats && (stats.view > 0 || stats.blocked > 0 || contacts > 0) && (
            <View style={{ padding: 18, gap: 12, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, ...shadow.sm }}>
              <AppText variant="heading" style={{ fontSize: 17 }}>Lo que has conseguido</AppText>
              <AppText variant="caption" color={C.outline} style={{ marginTop: -8 }}>Últimos 30 días</AppText>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Bignum value={stats.view} label={stats.view === 1 ? "persona vio tu local" : "personas vieron tu local"} />
                {plan ? (
                  <Bignum value={contacts} label={contacts === 1 ? "te contactó" : "te contactaron"} tone={C.primary} />
                ) : (
                  <Bignum value={stats.blocked} label={stats.blocked === 1 ? "quiso contactarte y no pudo" : "quisieron contactarte y no pudieron"} tone={C.error} />
                )}
              </View>
              {!plan && stats.blocked > 0 && (
                <AppText variant="bodySm" color={C.onSurfaceVariant}>
                  Con el plan, tu WhatsApp, tu teléfono y tu Instagram quedan visibles y esas personas llegan hasta ti.
                </AppText>
              )}
              {plan && (
                <AppText variant="caption" color={C.outline}>El detalle por día y por canal está en Métricas.</AppText>
              )}
            </View>
          )}

          {/* Qué incluye */}
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, ...shadow.sm }}>
            <AppText variant="heading" style={{ fontSize: 17 }}>{plan ? "Lo que incluye tu plan" : "Lo que te falta"}</AppText>
            <AppText variant="caption" color={C.outline} style={{ marginTop: 2, marginBottom: 6 }}>
              {plan ? "Todo esto lo ven tus comensales." : "Con el plan, tus comensales ven todo esto."}
            </AppText>
            {PLAN_PERKS.map((p) => (
              <PerkRow key={p.label} icon={p.icon} label={p.label} state={plan ? "included" : "locked"} />
            ))}
            <View style={{ height: 1, backgroundColor: C.outlineVariant, marginVertical: 8 }} />
            <AppText variant="overline" color={C.outline} style={{ marginBottom: 2 }}>SIEMPRE, CON O SIN PLAN</AppText>
            {FREE_PERKS.map((p) => (
              <PerkRow key={p.label} icon={p.icon} label={p.label} state="always" />
            ))}
          </View>

          {!founder && !PAYMENTS_IN_APP && (!plan || ending) && (
            <View style={{ gap: 10 }}>
              <Button
                label={plan ? "Hablar con soporte sobre tu plan" : "Hablar con soporte sobre tu plan"}
                onPress={() => router.push("/support" as any)}
                icon="lifebuoy"
              />
              <AppText variant="caption" color={C.outline} align="center">
                Escríbenos desde Soporte y te ayudamos con tu plan.
              </AppText>
            </View>
          )}

          {!founder && !PAYMENTS_IN_APP && plan && !ending && (
            <Pressable
              onPress={() => router.push("/support" as any)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                padding: 14, borderRadius: 16,
                backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
              }}
            >
              <Icon name="lifebuoy" size={20} color={C.primary} />
              <AppText variant="bodySm" style={{ flex: 1 }}>
                ¿Dudas sobre tu plan? Escríbenos desde Soporte.
              </AppText>
              <Icon name="chevron-right" size={18} color={C.outline} />
            </Pressable>
          )}

          {!founder && PAYMENTS_IN_APP && (
            <>
              {/* Cómo pagar */}
              <View style={{ gap: 10 }}>
                <AppText variant="heading" style={{ fontSize: 17 }}>Cómo pagar</AppText>
                <PaymentMethodPicker method={method} onMethodChange={setMethod} />
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
