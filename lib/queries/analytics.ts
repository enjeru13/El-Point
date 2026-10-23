import type { DailyRow } from "@/lib/metrics";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type RestaurantEventType =
  | "view"
  | "whatsapp"
  | "call"
  | "directions"
  | "instagram"
  | "menu"
  | "blocked"
  | "order";

/**
 * Cuenta una interacción con un local. Sin esperar y sin avisar si falla: no
 * debe retrasar ni romper la acción del usuario. El servidor ignora al propio
 * dueño y repeticiones del mismo usuario en la misma hora.
 */
export function trackRestaurantEvent(restaurantId: string, type: RestaurantEventType): void {
  if (!restaurantId) return;
  supabase
    .rpc("track_restaurant_event", { p_restaurant_id: restaurantId, p_type: type })
    .then(
      () => {},
      () => {},
    );
}

export type RestaurantStats = Record<RestaurantEventType, number>;

const EMPTY: RestaurantStats = { view: 0, whatsapp: 0, call: 0, directions: 0, instagram: 0, menu: 0, blocked: 0, order: 0 };

/**
 * Interacciones por día y tipo. Trae el doble de días para poder comparar el
 * periodo actual con el anterior.
 */
export function useRestaurantDaily(restaurantId: string | undefined, days: number) {
  return useQuery({
    queryKey: ["restaurant-daily", restaurantId, days],
    enabled: !!restaurantId,
    staleTime: 60_000,
    queryFn: async (): Promise<DailyRow[]> => {
      const { data, error } = await supabase.rpc("get_restaurant_stats", {
        p_restaurant_id: restaurantId!,
        p_days: Math.min(days * 2, 400),
      });
      if (error) throw error;
      return ((data ?? []) as DailyRow[]).map((r) => ({ event_type: r.event_type, day: String(r.day).slice(0, 10), total: Number(r.total) }));
    },
  });
}

export type CategoryBenchmark = {
  /** Locales de tu categoría con visitas en el período. */
  peers: number;
  myViews: number;
  myContacts: number;
  /** Solo hay cifras si se comparan al menos 5 locales. */
  medianViews: number | null;
  medianContacts: number | null;
  /** Porcentaje de locales de la categoría con menos visitas que tú. */
  pctBelowViews: number | null;
};

/** Cómo vas frente a los locales de tu categoría (solo agregados; mínimo 5 locales). */
export function useCategoryBenchmark(restaurantId: string | undefined, days: number, enabled = true) {
  return useQuery({
    queryKey: ["category-benchmark", restaurantId, days],
    enabled: !!restaurantId && enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CategoryBenchmark | null> => {
      const { data, error } = await supabase.rpc("get_category_benchmark", {
        p_restaurant_id: restaurantId!,
        p_days: days,
      });
      if (error) throw error;
      const row = (data ?? [])[0];
      if (!row) return null;
      return {
        peers: Number(row.peer_count),
        myViews: Number(row.my_views),
        myContacts: Number(row.my_contacts),
        medianViews: row.median_views == null ? null : Number(row.median_views),
        medianContacts: row.median_contacts == null ? null : Number(row.median_contacts),
        pctBelowViews: row.pct_below_views == null ? null : Number(row.pct_below_views),
      };
    },
  });
}

/** Totales por tipo de interacción en los últimos `days` días (dueño o admin). */
export function useRestaurantStats(restaurantId: string | undefined, days: number) {
  return useQuery({
    queryKey: ["restaurant-stats", restaurantId, days],
    enabled: !!restaurantId,
    staleTime: 60_000,
    queryFn: async (): Promise<RestaurantStats> => {
      const { data, error } = await supabase.rpc("get_restaurant_stats", {
        p_restaurant_id: restaurantId!,
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
