import { MenuEditor } from "@/components/owner/MenuEditor";
import { SectionShell } from "@/components/owner/SectionShell";
import {
  AmenitiesSection,
  HoursSection,
  OrdersSection,
  PaymentsSection,
  PhotosSection,
  PromoSection,
} from "@/components/owner/sections";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlanLock } from "@/components/ui/PlanLock";
import { Skeleton } from "@/components/ui/Skeleton";
import { hasPlan } from "@/lib/plan";
import { useMyRestaurant, type OwnerRestaurant } from "@/lib/queries/owner";
import { useTheme } from "@/lib/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";

type Def = {
  title: string;
  lockBody: string;
  /** La cocina fantasma usa la sección aunque no tenga plan. */
  freeForGhost?: boolean;
  render: (r: OwnerRestaurant) => ReactNode;
};

const SECTIONS: Record<string, Def> = {
  menu: {
    title: "Menú",
    lockBody: "Platos con precio en dólares, bolívares o pesos, plato del día con aviso a quienes te siguen, y tu carta en PDF.",
    render: (r) => <MenuEditor restaurant={r} />,
  },
  hours: {
    title: "Horario",
    lockBody: "Tu horario y el “abierto ahora” se ven en tu perfil.",
    render: (r) => <HoursSection restaurant={r} />,
  },
  promo: {
    title: "Promoción",
    lockBody: "Publica una promo y avisamos a quienes te tienen en favoritos.",
    render: (r) => <PromoSection restaurant={r} />,
  },
  orders: {
    title: "Pedidos por WhatsApp",
    lockBody: "Muestra un botón “Pedir” que abre tu WhatsApp con el mensaje listo.",
    freeForGhost: true,
    render: (r) => <OrdersSection restaurant={r} />,
  },
  amenities: {
    title: "Comodidades",
    lockBody: "Muestra wifi, estacionamiento, aire acondicionado y más para que te elijan.",
    render: (r) => <AmenitiesSection restaurant={r} />,
  },
  payments: {
    title: "Métodos de pago",
    lockBody: "Indica cómo te pueden pagar y entra en los filtros de búsqueda.",
    render: (r) => <PaymentsSection restaurant={r} />,
  },
  photos: {
    title: "Fotos",
    lockBody: "Una galería de hasta 8 fotos de tus platos y tu local, más portada y logo: lo primero que ve el comensal.",
    render: (r) => <PhotosSection restaurant={r} />,
  },
};

/** Una sección de "Mi local" a pantalla completa. */
export default function LocalSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { C } = useTheme();
  const router = useRouter();
  const restaurantQ = useMyRestaurant();
  const r = restaurantQ.data ?? null;
  const def = SECTIONS[section ?? ""];

  if (!def) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, justifyContent: "center" }}>
        <EmptyState icon="store-outline" title="Sección no encontrada" body="Vuelve a Mi local y elige otra." actionLabel="Volver" onAction={() => router.back()} />
      </View>
    );
  }

  if (restaurantQ.isLoading || !r) {
    return (
      <SectionShell title={def.title}>
        {restaurantQ.isLoading ? <Skeleton height={180} radius={22} /> : (
          <EmptyState icon="store-outline" title="Aún no tienes un local" body="Registra tu local para gestionarlo." actionLabel="Volver" onAction={() => router.back()} />
        )}
      </SectionShell>
    );
  }

  const allowed = hasPlan(r) || (!!def.freeForGhost && r.ghost_kitchen);

  return (
    <SectionShell title={def.title} subtitle={r.name}>
      {allowed ? (
        def.render(r)
      ) : (
        <PlanLock title={def.title} body={def.lockBody} onPress={() => router.push("/subscription" as any)} />
      )}
    </SectionShell>
  );
}
