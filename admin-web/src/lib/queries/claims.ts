import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

export type PendingClaim = {
  id: string;
  created_at: string;
  full_name: string;
  whatsapp: string;
  rif: string | null;
  photo_url: string | null;
  /** @usuario de la cuenta, si tiene. */
  username: string | null;
  restaurant: { id: string; name: string; address: string | null; lat: number | null; lng: number | null };
  /** Otras personas que también pidieron este local. */
  competing: number;
};

const KEY = ["admin-claims"] as const;

async function fetchPendingClaims(): Promise<PendingClaim[]> {
  const { data, error } = await supabase
    .from("restaurant_claims")
    .select(
      `id, created_at, full_name, whatsapp, rif, photo_path, restaurant_id,
       user:profiles!user_id ( username, full_name ),
       restaurant:restaurants ( id, name, address, latitude, longitude )`,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as any[];
  const perLocal = new Map<string, number>();
  for (const r of rows) perLocal.set(r.restaurant_id, (perLocal.get(r.restaurant_id) ?? 0) + 1);

  return Promise.all(
    rows.map(async (r) => {
      const { data: signed } = await supabase.storage.from("restaurant-verification").createSignedUrl(r.photo_path, 3600);
      return {
        id: r.id,
        created_at: r.created_at,
        full_name: r.full_name,
        whatsapp: r.whatsapp,
        rif: r.rif,
        photo_url: signed?.signedUrl ?? null,
        username: r.user?.username ? `@${r.user.username}` : null,
        restaurant: {
          id: r.restaurant?.id ?? r.restaurant_id,
          name: r.restaurant?.name ?? "Local",
          address: r.restaurant?.address ?? null,
          lat: r.restaurant?.latitude ?? null,
          lng: r.restaurant?.longitude ?? null,
        },
        competing: (perLocal.get(r.restaurant_id) ?? 1) - 1,
      };
    }),
  );
}

export function usePendingClaims() {
  return useQuery({ queryKey: KEY, queryFn: fetchPendingClaims });
}

export function useReviewClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) => {
      const { error } = await supabase.rpc("admin_review_claim", {
        p_claim_id: id,
        p_approve: approve,
        p_reason: reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
      qc.invalidateQueries({ queryKey: ["admin-locales"] });
    },
  });
}
