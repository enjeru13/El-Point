import { Icon } from "@/components/ui/Icon";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/ThemeContext";
import { useMyRestaurant } from "@/lib/queries/owner";
import { isBoosted } from "@/lib/queries/restaurants";
import { capWidth, useIsTablet } from "@/lib/responsive";

function daysLeft(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function CheckRow({ done, label }: { done: boolean; label: string }) {
  const { C } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Icon
        name={done ? "check-circle" : "circle-outline"}
        size={18}
        color={done ? C.primary : C.outlineVariant}
      />
      <AppText variant="bodySm" color={done ? C.onSurface : C.onSurfaceVariant}>
        {label}
      </AppText>
    </View>
  );
}

function WayCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  const { C, shadow } = useTheme();
  return (
    <View
      style={{
        borderRadius: 22,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        padding: 18,
        gap: 12,
        ...shadow.sm,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: C.primaryFixed,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Icon name={icon} size={19} color={C.primary} />
        </View>
        <AppText variant="heading" style={{ fontSize: 16, flex: 1 }}>
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

export default function BoostInfoScreen() {
  const { C, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isTablet = useIsTablet();

  const restaurantQ = useMyRestaurant();
  const r = restaurantQ.data ?? null;

  const active = isBoosted(r);
  const left = r ? daysLeft(r.boost_until) : 0;
  const streak = r?.host_streak_weeks ?? 0;

  const checks = r
    ? [
        { done: !!r.logo_url, label: "Logo del local" },
        { done: !!r.cover_url, label: "Foto de portada" },
        { done: !!(r.description ?? "").trim(), label: "Descripción" },
        { done: !!(r.address ?? "").trim(), label: "Dirección" },
        { done: !!(r.phone ?? "").trim() || !!(r.whatsapp ?? "").trim(), label: "Teléfono o WhatsApp" },
        { done: r.categories.length > 0, label: "Al menos 1 categoría" },
        { done: r.amenities.length > 0, label: "Al menos 1 comodidad" },
      ]
    : [];
  const profileComplete = checks.length > 0 && checks.every((c) => c.done);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
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
        <AppText variant="title" style={{ flex: 1 }}>Destacado</AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          gap: 18,
          paddingBottom: insets.bottom + 40,
          ...capWidth(isTablet, 640),
        }}
      >
        {/* Qué es */}
        <View
          style={{
            borderRadius: 24,
            padding: 20,
            gap: 10,
            backgroundColor: C.primary + "14",
            borderWidth: 1,
            borderColor: C.primary + "40",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon name="fire" size={22} color={C.primary} />
            <AppText variant="heading" style={{ fontSize: 18 }}>Qué es Destacado</AppText>
          </View>
          <AppText variant="body" color={C.onSurfaceVariant} style={{ lineHeight: 21 }}>
            Mientras esté activo, tu local aparece primero en el mapa y en
            Explorar, y lleva la insignia "Destacado". Más visibilidad, más
            clientes — y es gratis: se gana, no se compra.
          </AppText>
        </View>

        {/* Estado actual */}
        {r && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              padding: 16,
              borderRadius: 20,
              backgroundColor: active ? C.primaryFixed : C.surface,
              borderWidth: 1,
              borderColor: C.border,
              ...shadow.sm,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: active ? C.primary : C.surfaceContainerHighest,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="fire" size={22} color={active ? "#fff" : C.outline} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">
                {active ? `Destacado activo · ${left} ${left === 1 ? "día" : "días"} más` : "Sin Destacado activo ahora"}
              </AppText>
              <AppText variant="bodySm" color={C.onSurfaceVariant} style={{ marginTop: 1 }}>
                {active
                  ? `Hasta el ${new Date(r.boost_until!).toLocaleDateString("es-VE", { day: "numeric", month: "long" })}`
                  : "Completa tu perfil o responde tus reseñas para ganarlo."}
              </AppText>
            </View>
          </View>
        )}

        {/* 3 formas de conseguirlo */}
        <View style={{ gap: 6 }}>
          <AppText variant="heading" style={{ fontSize: 17 }}>3 formas de ganarlo</AppText>
          <AppText variant="bodySm" color={C.outline}>Ninguna requiere pago.</AppText>
        </View>

        <WayCard icon="check-decagram" title="1. Al aprobarse tu local">
          <AppText variant="body" color={C.onSurfaceVariant} style={{ lineHeight: 20 }}>
            Apenas aprobamos tu local por primera vez, arranca con{" "}
            <AppText variant="bodyStrong" color={C.onSurface}>14 días</AppText> de Destacado
            de regalo. Automático, no tienes que hacer nada.
          </AppText>
        </WayCard>

        <WayCard icon="clipboard-check-outline" title="2. Completa tu perfil">
          <AppText variant="body" color={C.onSurfaceVariant} style={{ lineHeight: 20 }}>
            La primera vez que tu perfil tenga todo esto,{" "}
            <AppText variant="bodyStrong" color={C.onSurface}>+7 días</AppText> de regalo (una sola vez):
          </AppText>
          <View style={{ gap: 8, marginTop: 2 }}>
            {(checks.length > 0
              ? checks
              : [
                  { done: false, label: "Logo del local" },
                  { done: false, label: "Foto de portada" },
                  { done: false, label: "Descripción" },
                  { done: false, label: "Dirección" },
                  { done: false, label: "Teléfono o WhatsApp" },
                  { done: false, label: "Al menos 1 categoría" },
                  { done: false, label: "Al menos 1 comodidad" },
                ]
            ).map((c) => (
              <CheckRow key={c.label} done={c.done} label={c.label} />
            ))}
          </View>
          {r && !profileComplete && (
            <Button
              label="Ir a completar mi perfil"
              onPress={() => router.push("/(owner)/profile")}
              variant="secondary"
              size="sm"
              fullWidth={false}
              icon="pencil-outline"
              style={{ marginTop: 4 }}
            />
          )}
          {profileComplete && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <Icon name="check-circle" size={16} color={C.primary} />
              <AppText variant="label" color={C.primary}>Perfil completo</AppText>
            </View>
          )}
        </WayCard>

        <WayCard icon="reply-all-outline" title="3. Sé buen anfitrión">
          <AppText variant="body" color={C.onSurfaceVariant} style={{ lineHeight: 20 }}>
            Cada semana en la que respondas{" "}
            <AppText variant="bodyStrong" color={C.onSurface}>todas</AppText> las reseñas que recibiste:
            {" "}<AppText variant="bodyStrong" color={C.onSurface}>+2 días</AppText>.
            {" "}Si encadenas 4 semanas seguidas, {" "}
            <AppText variant="bodyStrong" color={C.onSurface}>+7 días extra</AppText> de bono.
          </AppText>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 2,
              padding: 10,
              borderRadius: 12,
              backgroundColor: C.surfaceContainerLow,
            }}
          >
            <Icon name="progress-check" size={16} color={C.secondary} />
            <AppText variant="bodySm" color={C.onSurfaceVariant}>
              {streak > 0
                ? `Llevas ${streak} ${streak === 1 ? "semana seguida" : "semanas seguidas"}.`
                : "Aún no empiezas tu racha."}
            </AppText>
          </View>
          <AppText variant="caption" color={C.outline} style={{ marginTop: 2, lineHeight: 15 }}>
            Solo cuentan las semanas en las que recibiste reseñas. Si una
            semana con reseñas se queda sin responder, la racha se reinicia —
            pero el Destacado que ya ganaste no se pierde.
          </AppText>
        </WayCard>

        <AppText variant="caption" color={C.outline} align="center" style={{ marginTop: 4, lineHeight: 16 }}>
          Más adelante sumaremos otras formas de ganarlo — y una opción para
          asegurarlo todo el año.
        </AppText>
      </ScrollView>
    </View>
  );
}
