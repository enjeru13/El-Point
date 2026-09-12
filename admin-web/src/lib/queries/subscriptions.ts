import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

export type SubStatus = "founder" | "active" | "expired" | "none";

export type RestaurantSubscription = {
  id: string;
  name: string;
  owner_name: string;
  founder_rank: number | null;
  paid_until: string | null;
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
      `id, name, founder_rank, paid_until,
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
    status: computeStatus(r.founder_rank, r.paid_until),
  }));
}

export function useSubscriptions() {
  return useQuery({ queryKey: KEY, queryFn: fetchSubscriptions });
}
