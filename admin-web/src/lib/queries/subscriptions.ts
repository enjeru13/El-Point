import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

export type SubStatus = "founder" | "active" | "expired" | "none";

export type RestaurantSubscription = {
  id: string;
  name: string;
  owner_name: string;
  founder_rank: number | null;
  paid_until: string | null;
  boost_until: string | null;
  status: SubStatus;
};

const KEY = ["admin-subscriptions"] as const;

function computeStatus(founder_rank: number | null, paid_until: string | null): SubStatus {
  if (founder_rank != null) return "founder";
  if (!paid_until) return "none";
  return new Date(paid_until).getTime() > Date.now() ? "active" : "expired";
}

/** Días restantes (negativo = vencido hace N días); null si nunca tuvo plan. */
export function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

async function fetchSubscriptions(): Promise<RestaurantSubscription[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      `id, name, founder_rank, paid_until, boost_until,
       owner:profiles!owner_id ( username, full_name )`,
    )
    .eq("status", "approved")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    owner_name: r.owner?.username ? `@${r.owner.username}` : (r.owner?.full_name ?? "Dueño"),
    founder_rank: r.founder_rank,
    paid_until: r.paid_until,
    boost_until: r.boost_until ?? null,
    status: computeStatus(r.founder_rank, r.paid_until),
  }));
}

export function useSubscriptions() {
  return useQuery({ queryKey: KEY, queryFn: fetchSubscriptions });
}

export type PlanAction = "remove" | "add_days" | "set_date" | "remove_boost";

/** Ajusta el plan de un local desde el panel: quitarlo, regalar días, fijar fecha o quitar el Destacado. */
export function useAdjustPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { restaurantId: string; action: PlanAction; days?: number; date?: string; reason?: string }) => {
      const { error } = await supabase.rpc("admin_set_plan", {
        p_restaurant_id: input.restaurantId,
        p_action: input.action,
        p_days: input.days ?? null,
        p_date: input.date ?? null,
        p_reason: input.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["admin-locales"] });
      qc.invalidateQueries({ queryKey: ["admin-local", v.restaurantId] });
      qc.invalidateQueries({ queryKey: ["admin-paying-restaurants"] });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    },
  });
}
