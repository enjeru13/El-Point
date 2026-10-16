import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { DEFAULT_HOURS, formatRange } from "@/lib/hours";
import { hasPlan } from "@/lib/plan";
import { isSpecialActive, useMenu } from "@/lib/queries/menu";
import { useMyRestaurant } from "@/lib/queries/owner";
import { capWidth, useIsTablet } from "@/lib/responsive";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";

type Row = { key: string; icon: string; title: string; summary: string; locked?: boolean };

/** Pestaña "Mi local": lo que el dueño toca a diario, cada sección en su propia pantalla. */
export default function MyLocalScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isTablet = useIsTablet();
  const restaurantQ = useMyRestaurant();
  const r = restaurantQ.data ?? null;
  const plan = !!r && hasPlan(r);
  const menuQ = useMenu(r?.id, plan);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([restaurantQ.refetch(), menuQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  if (restaurantQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, paddingTop: insets.top + 20, paddingHorizontal: 20, gap: 14 }}>
        <Skeleton width={140} height={26} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={72} radius={20} />
        ))}
      </View>
    );
  }

  if (!r) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, justifyContent: "center" }}>
        <EmptyState
          icon="store-outline"
          title="Aún no tienes un local"
          body="Cuando registres tu local, aquí gestionas su menú, horario y promociones."
          actionLabel="Reintentar"
          onAction={() => restaurantQ.refetch()}
        />
      </View>
    );
  }

  const menuItems = menuQ.data ?? [];
  const special = menuItems.find((i) => isSpecialActive(i));
  const today = (r.hours ?? DEFAULT_HOURS).days[new Date().getDay()];

  const rows: Row[] = [
    {
      key: "menu",
      icon: "silverware-fork-knife",
      title: "Menú",
      summary: !plan
        ? "Platos con precio y plato del día"
        : menuItems.length === 0
          ? "Aún sin platos"
          : `${menuItems.length} ${menuItems.length === 1 ? "plato" : "platos"}${special ? ` · hoy: ${special.name}` : ""}`,
      locked: !plan,
    },
    {
      key: "hours",
      icon: "clock-outline",
      title: "Horario",
      summary: !plan ? "Tus horas y “abierto ahora”" : r.hours ? `Hoy: ${formatRange(today)}` : "Sin configurar",
      locked: !plan,
    },
    {
      key: "promo",
      icon: "tag-outline",
      title: "Promoción",
      summary: !plan ? "Una oferta con aviso a tus seguidores" : r.promo_text || "Sin promoción activa",
      locked: !plan,
    },
    {
      key: "orders",
      icon: "whatsapp",
      title: "Pedidos por WhatsApp",
      summary: r.ghost_kitchen ? "Siempre activo" : !plan ? "Botón “Pedir” con mensaje listo" : r.accepts_orders ? "Activados" : "Desactivados",
      locked: !plan && !r.ghost_kitchen,
    },
    {
      key: "amenities",
      icon: "check-circle",
      title: "Comodidades",
      summary: !plan ? "Wifi, estacionamiento, aire y más" : r.amenities.length ? `${r.amenities.length} marcadas` : "Ninguna marcada",
      locked: !plan,
    },
    {
      key: "payments",
      icon: "wallet-outline",
      title: "Métodos de pago",
      summary: !plan ? "Cómo te pueden pagar" : r.payment_methods.length ? `${r.payment_methods.length} aceptados` : "Sin indicar",
      locked: !plan,
    },
    {
      key: "photos",
      icon: "camera-plus-outline",
      title: "Fotos y menú en PDF",
      summary: !plan
        ? "Portada, logo y carta en PDF"
        : [r.cover_url ? "Portada ✓" : "Sin portada", r.logo_url ? "Logo ✓" : "Sin logo", r.menu_pdf_url ? "PDF ✓" : "Sin PDF"].join(" · "),
      locked: !plan,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 20 }}>
        <AppText variant="title">Mi local</AppText>
        <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 2 }} numberOfLines={1}>
          {r.name}
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 110, gap: 10, ...capWidth(isTablet) }}
      >
        {!plan && (
          <Pressable
            onPress={() => router.push("/subscription" as any)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: 18,
              backgroundColor: C.primaryFixed,
              borderWidth: 1,
              borderColor: C.border,
              marginBottom: 6,
            }}
          >
            <Icon name="lock-outline" size={20} color={C.primary} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Tu perfil es básico</AppText>
              <AppText variant="caption" color={C.onSurfaceVariant}>
                Con un plan activas todo lo de abajo. Toca para ver qué incluye.
              </AppText>
            </View>
            <Icon name="chevron-right" size={18} color={C.outline} />
          </Pressable>
        )}

        {rows.map((row) => (
          <Pressable
            key={row.key}
            onPress={() => router.push(`/local/${row.key}` as any)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              padding: 16,
              borderRadius: 20,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              ...shadow.sm,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                backgroundColor: row.locked ? C.surfaceContainerHighest : C.primaryFixed,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={row.icon} size={20} color={row.locked ? C.outline : C.primary} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <AppText variant="bodyStrong">{row.title}</AppText>
              <AppText variant="bodySm" color={C.onSurfaceVariant} numberOfLines={1}>
                {row.summary}
              </AppText>
            </View>
            <Icon name={row.locked ? "lock-outline" : "chevron-right"} size={row.locked ? 16 : 18} color={C.outline} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
