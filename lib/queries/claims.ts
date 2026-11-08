import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSessionUser, supabase } from "@/lib/supabase";
import { uploadClaimPhoto } from "@/lib/storage";

export type ClaimStatus = "pending" | "approved" | "rejected";

export type MyClaim = {
  id: string;
  restaurant_id: string;
  status: ClaimStatus;
  reason: string | null;
  created_at: string;
};

/** Mi última solicitud para reclamar este local (null si nunca la pedí). */
export function useMyClaim(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["my-claim", restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<MyClaim | null> => {
      const { data: u } = await getSessionUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from("restaurant_claims")
        .select("id, restaurant_id, status, reason, created_at")
        .eq("restaurant_id", restaurantId!)
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as MyClaim | null) ?? null;
    },
  });
}

/** Sube la foto de prueba y envía la solicitud. */
export function useSubmitClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { restaurantId: string; fullName: string; whatsapp: string; rif: string; photoUri: string }) =>
      submitClaim(v),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["my-claim", v.restaurantId] });
    },
  });
}

export type LatestClaim = MyClaim & { restaurant_name: string | null };

/** Mi solicitud más reciente, de cualquier local (para el panel de dueño sin local). */
export function useMyLatestClaim(enabled = true) {
  return useQuery({
    queryKey: ["my-claim", "latest"],
    enabled,
    queryFn: async (): Promise<LatestClaim | null> => {
      const { data: u } = await getSessionUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from("restaurant_claims")
        .select("id, restaurant_id, status, reason, created_at, restaurant:restaurants ( name )")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { restaurant, ...rest } = data as any;
      return { ...rest, restaurant_name: restaurant?.name ?? null } as LatestClaim;
    },
  });
}

export type ClaimMatch = { id: string; name: string; address: string | null; distance_m: number };

/** Locales sin dueño cerca del pin con un nombre parecido. */
export async function findClaimableMatches(name: string, lat: number, lng: number): Promise<ClaimMatch[]> {
  const { data, error } = await supabase.rpc("find_claimable_matches", { p_name: name, p_lat: lat, p_lng: lng });
  if (error) return [];
  return (data ?? []) as ClaimMatch[];
}

/** Envía la solicitud desde el registro de dueño, con la foto que ya tomó. */
export async function submitClaim(v: {
  restaurantId: string;
  fullName: string;
  whatsapp: string;
  rif: string;
  photoUri: string;
}): Promise<void> {
  const { data: u } = await getSessionUser();
  if (!u.user) throw new Error("Inicia sesión para continuar");
  const path = await uploadClaimPhoto(u.user.id, v.photoUri);
  const { error } = await supabase.rpc("submit_restaurant_claim", {
    p_restaurant_id: v.restaurantId,
    p_full_name: v.fullName.trim(),
    p_whatsapp: v.whatsapp.trim(),
    p_rif: v.rif.trim(),
    p_photo_path: path,
  });
  if (error) throw new Error(error.message);
}
