import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type RestaurantEventType =
  | "view"
  | "whatsapp"
  | "call"
  | "directions"
  | "instagram"
  | "menu";

/**
 * Cuenta una interacción con un local. Sin esperar y sin avisar si falla: no
 * debe retrasar ni romper la acción del usuario. El servidor ignora al propio
 * dueño y repeticiones del mismo usuario en la misma hora.
 */
export function trackRestaurantEvent(restaurantId: string, type: RestaurantEventType): void {
  if (!restaurantId) return;
  // RPC nuevo: los tipos generados no lo conocen hasta regenerarlos tras el db push.
  (supabase as any)
    .rpc("track_restaurant_event", { p_restaurant_id: restaurantId, p_type: type })
    .then(
      () => {},
      () => {},
    );
}

export type RestaurantStats = Record<RestaurantEventType, number>;

const EMPTY: RestaurantStats = { view: 0, whatsapp: 0, call: 0, directions: 0, instagram: 0, menu: 0 };

/** Totales por tipo de interacción en los últimos `days` días (dueño o admin). */
export function useRestaurantStats(restaurantId: string | undefined, days: number) {
  return useQuery({
    queryKey: ["restaurant-stats", restaurantId, days],
    enabled: !!restaurantId,
    staleTime: 60_000,
    queryFn: async (): Promise<RestaurantStats> => {
      const { data, error } = await (supabase as any).rpc("get_restaurant_stats", {
        p_restaurant_id: restaurantId,
        p_days: days,
      });
      if (error) throw error;
      const out: RestaurantStats = { ...EMPTY };
      for (const row of (data ?? []) as { event_type: RestaurantEventType; total: number }[]) {
        if (row.event_type in out) out[row.event_type] += Number(row.total);
      }
      return out;
    },
  });
}
