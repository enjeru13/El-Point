import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { hasPlan } from "@/lib/plan";
import { activePromo } from "@/lib/promo";
import { useRestaurantStats } from "@/lib/queries/analytics";
import { useGallery } from "@/lib/queries/gallery";
import { useMenu } from "@/lib/queries/menu";
import type { OwnerRestaurant } from "@/lib/queries/owner";
import { isBoosted, isFounder } from "@/lib/queries/restaurants";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

const DAY = 86_400_000;
const GOLD = "#f0c260";

function daysFrom(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY);
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "long" });
}

/** Nombre corto del tipo de plan vigente. */
export const KIND_LABEL: Record<string, string> = {
  trial: "Prueba gratis",
  monthly: "Plan mensual",
  quarterly: "Plan trimestral",
  annual: "Plan anual",
  courtesy: "Cortesía",
  manual: "Plan activo",
};

/**
 * Días totales del periodo vigente: del inicio de la cobertura hasta el
 * vencimiento. Si el local aún no tiene el inicio guardado (datos anteriores),
 * se aproxima con el periodo estándar más cercano.
 */
export function periodDays(r: OwnerRestaurant, left: number): number {
  if (r.plan_period_start && r.paid_until) {
    const total = Math.ceil((new Date(r.paid_until).getTime() - new Date(r.plan_period_start).getTime()) / DAY);
    if (total >= left && total > 0) return total;
  }
  return [30, 90, 365].find((p) => left <= p) ?? left;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function Bar({ pct, color }: { pct: number; color: string }) {
  const { C } = useTheme();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: C.outlineVariant, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(4, Math.min(100, pct * 100))}%`, height: "100%", borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

function Divider() {
  const { C } = useTheme();
  return <View style={{ height: 1, backgroundColor: C.outlineVariant }} />;
}

/**
 * Tarjeta única de estado: visibilidad, plan (con barra de días) y Destacado.
 * Un local aprobado ve aquí, de un vistazo, si lo encuentran, hasta cuándo
 * tiene el perfil completo y cuántos días de Destacado le quedan.
 */
export function StatusCard({ restaurant: r }: { restaurant: OwnerRestaurant }) {
  const { C, shadow } = useTheme();
  const router = useRouter();

  const founder = isFounder(r);
  const plan = hasPlan(r);
  const left = daysFrom(r.paid_until);
  const boosted = isBoosted(r);
  const boostLeft = daysFrom(r.boost_until);
  const ending = plan && !founder && left !== null && left <= 7;

  // Tono del plan: verde sano, ámbar si vence pronto, rojo si no hay plan.
  const planColor = founder ? GOLD : !plan ? C.error : ending ? "#d99a1c" : C.secondary;

  return (
    <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden", ...shadow.sm }}>
      {/* Visibilidad */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: r.is_active ? C.primary : C.outline,
          }}
        >
          <Icon name={r.is_active ? "store-outline" : "eye-off-outline"} size={22} color="#fff" />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="bodyStrong">{r.is_active ? "Visible en El Point" : "Local pausado"}</AppText>
          <AppText variant="bodySm" color={C.onSurfaceVariant}>
            {!r.is_active
              ? "No aparece para los comensales."
              : plan
                ? "Aparece en el mapa y las búsquedas con tu perfil completo."
                : "Aparece en el mapa, pero con perfil básico."}
          </AppText>
        </View>
      </View>

      <Divider />

      {/* Plan */}
      <View style={{ padding: 16, gap: 10 }}>
        {founder ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: GOLD + "33", alignItems: "center", justifyContent: "center" }}>
              <Icon name="crown" size={18} color={GOLD} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Original #{r.founder_rank}</AppText>
              <AppText variant="bodySm" color={C.onSurfaceVariant}>Tu perfil completo es gratis para siempre.</AppText>
            </View>
          </View>
        ) : plan && left !== null ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <AppText variant="bodyStrong">{(r.plan_kind && KIND_LABEL[r.plan_kind]) || "Plan activo"}</AppText>
              <AppText variant="title" color={planColor} style={{ fontSize: 20 }}>
                {plural(Math.max(left, 0), "día", "días")}
              </AppText>
            </View>
            <Bar pct={left / periodDays(r, left)} color={planColor} />
            <AppText variant="caption" color={C.onSurfaceVariant}>
              {ending ? "Vence pronto · " : ""}vence el {longDate(r.paid_until!)}.
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="bodyStrong" color={C.error}>Sin plan activo</AppText>
            <AppText variant="bodySm" color={C.onSurfaceVariant}>
              Activa un plan para mostrar tu contacto, menú, fotos y promos, y para responder reseñas.
            </AppText>
          </>
        )}

        {!founder && (ending || !plan) && (
          <Pressable
            onPress={() => router.push("/subscription" as any)}
            style={{
              marginTop: 2,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 11,
              borderRadius: 14,
              backgroundColor: planColor,
            }}
          >
            <Icon name="calendar-check-outline" size={16} color="#fff" />
            <AppText variant="label" color="#fff">{plan ? "Renovar mi plan" : "Ver mi plan"}</AppText>
          </Pressable>
        )}
      </View>

      <Divider />

      {/* Destacado */}
      <Pressable onPress={() => router.push("/boost-info")} android_ripple={{ color: C.outlineVariant }} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: boosted ? C.primary + "22" : C.surfaceContainerHighest, alignItems: "center", justifyContent: "center" }}>
          <Icon name="fire" size={18} color={boosted ? C.primary : C.outline} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">
            {boosted && boostLeft !== null ? `Destacado · ${plural(boostLeft, "día", "días")}` : "Sin Destacado"}
          </AppText>
          <AppText variant="bodySm" color={C.onSurfaceVariant}>
            {boosted
              ? `Sales primero hasta el ${longDate(r.boost_until!)}.`
              : "Viene con tu plan y por responder reseñas. Toca para ver cómo."}
          </AppText>
          {r.host_streak_weeks > 0 && (
            <AppText variant="caption" color={C.secondary} style={{ marginTop: 2 }}>
              Racha de buen anfitrión: {plural(r.host_streak_weeks, "semana", "semanas")}.
            </AppText>
          )}
        </View>
        <Icon name="chevron-right" size={16} color={C.outline} />
      </Pressable>

      <Divider />

      {/* Pausar / editar */}
      <Pressable
        onPress={() => router.push("/(owner)/profile")}
        android_ripple={{ color: C.outlineVariant }}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 }}
      >
        <Icon name="cog-outline" size={15} color={C.onSurfaceVariant} />
        <AppText variant="label" color={C.onSurfaceVariant}>
          {r.is_active ? "Pausar o editar en Perfil" : "Activar en Perfil"}
        </AppText>
      </Pressable>
    </View>
  );
}

function Metric({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const { C, shadow } = useTheme();
  return (
    <View style={{ flex: 1, padding: 14, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, gap: 6, ...shadow.sm }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={17} color={color} />
      </View>
      <AppText variant="title" style={{ fontSize: 22, lineHeight: 27 }}>{value}</AppText>
      <AppText variant="caption" color={C.onSurfaceVariant} style={{ fontSize: 12 }}>{label}</AppText>
    </View>
  );
}

/** Los números que sí cambian: lo que pasó con el local en los últimos 7 días. */
export function WeekStats({ restaurant: r }: { restaurant: OwnerRestaurant }) {
  const { C } = useTheme();
  const router = useRouter();
  const plan = hasPlan(r);
  const q = useRestaurantStats(r.id, 7);
  const s = q.data;
  const n = (v: number | undefined) => (q.isLoading || v === undefined ? "–" : String(v));

  const contacts = s ? s.whatsapp + s.call + s.instagram + s.order : undefined;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <AppText variant="heading" style={{ fontSize: 17 }}>Esta semana</AppText>
        <Pressable onPress={() => router.push("/(owner)/analytics")} hitSlop={8}>
          <AppText variant="label" color={C.primary}>Ver métricas</AppText>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Metric icon="eye-outline" label="Visitas" value={n(s?.view)} color={C.primary} />
        {plan ? (
          <>
            <Metric icon="phone-outline" label="Contactos" value={n(contacts)} color={C.secondary} />
            <Metric icon="cart-outline" label="Pedidos" value={n(s?.order)} color={C.tertiary} />
          </>
        ) : (
          <>
            <Metric icon="lock-outline" label="Quisieron contactarte" value={n(s?.blocked)} color={C.error} />
            <Metric icon="star" label="Calificación" value={r.rating_count > 0 ? r.rating_avg.toFixed(1) : "–"} color={C.tertiary} />
          </>
        )}
      </View>
      <AppText variant="caption" color={C.outline}>Últimos 7 días.</AppText>
    </View>
  );
}

type Step = { key: string; label: string; done: boolean; to: string };

/** "Completa tu perfil": lo que falta, con acceso directo. Desaparece cuando está todo. */
export function ProfileChecklist({ restaurant: r }: { restaurant: OwnerRestaurant }) {
  const { C, shadow } = useTheme();
  const router = useRouter();
  const plan = hasPlan(r);
  const menuQ = useMenu(r.id, plan);
  const galleryQ = useGallery(r.id, plan);

  if (!plan) return null;

  const steps: Step[] = [
    { key: "gallery", label: "Sube 3 fotos de tus platos", done: (galleryQ.data?.length ?? 0) >= 3, to: "/local/photos" },
    { key: "cover", label: "Agrega tu foto de portada", done: !!r.cover_url, to: "/local/photos" },
    { key: "logo", label: "Sube tu logo", done: !!r.logo_url, to: "/local/photos" },
    { key: "hours", label: "Indica tu horario", done: !!r.hours, to: "/local/hours" },
    { key: "menu", label: "Arma tu menú con platos", done: (menuQ.data?.length ?? 0) > 0, to: "/local/menu" },
    { key: "promo", label: "Publica una promoción", done: !!activePromo(r), to: "/local/promo" },
    { key: "amenities", label: "Marca tus comodidades", done: r.amenities.length > 0, to: "/local/amenities" },
  ];
  const done = steps.filter((s) => s.done).length;
  // Mientras carga el menú no se muestra para que no parpadee un paso que sí está hecho.
  if (menuQ.isLoading || galleryQ.isLoading || done === steps.length) return null;

  return (
    <View style={{ borderRadius: 22, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: "hidden", ...shadow.sm }}>
      <View style={{ padding: 16, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <AppText variant="bodyStrong">Completa tu perfil</AppText>
          <AppText variant="label" color={C.onSurfaceVariant}>{done} de {steps.length}</AppText>
        </View>
        <Bar pct={done / steps.length} color={C.primary} />
      </View>
      {steps
        .filter((s) => !s.done)
        .map((s) => (
          <Pressable
            key={s.key}
            onPress={() => router.push(s.to as any)}
            android_ripple={{ color: C.outlineVariant }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.outlineVariant }}
          >
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.outline }} />
            <AppText variant="bodySm" style={{ flex: 1 }}>{s.label}</AppText>
            <Icon name="chevron-right" size={16} color={C.outline} />
          </Pressable>
        ))}
    </View>
  );
}
