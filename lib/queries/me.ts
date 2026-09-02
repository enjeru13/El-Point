import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type MyProfile = {
  id: string;
  role: "customer" | "restaurant_owner";
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  level: number;
  xp: number;
  search_radius_km: number;
  settings: Record<string, boolean>;
  favorite_categories: number[];
  is_admin: boolean;
  strikes: number;
  banned_at: string | null;
  created_at: string;
};

async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, role, username, full_name, avatar_url, bio, level, xp, search_radius_km, settings, favorite_categories, is_admin, strikes, banned_at, created_at",
    )
    .eq("id", uid)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    ...(data as any),
    settings: ((data as any).settings ?? {}) as Record<string, boolean>,
    favorite_categories: ((data as any).favorite_categories ?? []) as number[],
    is_admin: !!(data as any).is_admin,
    strikes: ((data as any).strikes ?? 0) as number,
    banned_at: ((data as any).banned_at ?? null) as string | null,
  };
}

export function useMyProfile() {
  return useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, boolean>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");
      const current =
        qc.getQueryData<MyProfile | null>(["my-profile"])?.settings ?? {};
      const merged = { ...current, ...patch };
      const { error } = await supabase
        .from("profiles")
        .update({ settings: merged })
        .eq("id", userData.user.id);
      if (error) throw error;
      return merged;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["my-profile"] });
      const prev = qc.getQueryData<MyProfile | null>(["my-profile"]);
      if (prev)
        qc.setQueryData(["my-profile"], {
          ...prev,
          settings: { ...prev.settings, ...patch },
        });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(["my-profile"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["my-profile"] }),
  });
}

export type MyProfilePatch = Partial<{
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}>;

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: MyProfilePatch) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userData.user.id);
      if (error) {
        if (error.code === "23505")
          throw new Error("Ese nombre de usuario ya está en uso.");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export type MyReview = {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  restaurant: { id: string; name: string; icon: string } | null;
};

async function fetchMyReviews(): Promise<MyReview[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id, rating, body, created_at,
       restaurant:restaurants!restaurant_id (
         id, name, restaurant_categories ( categories ( icon ) )
       )`,
    )
    .eq("author_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    restaurant: r.restaurant
      ? {
          id: r.restaurant.id,
          name: r.restaurant.name,
          icon:
            r.restaurant.restaurant_categories?.[0]?.categories?.icon ??
            "silverware-fork-knife",
        }
      : null,
  }));
}

export function useMyReviews() {
  return useQuery({ queryKey: ["my-reviews"], queryFn: fetchMyReviews });
}

// Quadratic curve — mirrors the DB functions.
//   xpForLevel(L) = 50 * (L-1)^2 ;  levelForXp(xp) = floor(sqrt(xp/50)) + 1
export const xpForLevel = (level: number) =>
  50 * Math.pow(Math.max(1, level) - 1, 2);
export const levelForXp = (xp: number) =>
  Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1);

export function levelProgress(level: number, xp: number) {
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const pct = Math.max(0, Math.min(1, (xp - floor) / (next - floor)));
  return { floor, next, pct };
}

export const RANKS = [
  { max: 3, name: "Novato" },
  { max: 8, name: "Comensal" },
  { max: 15, name: "Explorador" },
  { max: 24, name: "Crítico Local" },
  { max: 34, name: "Gurú Gastronómico" },
  { max: Infinity, name: "Leyenda" },
] as const;

export function rankForLevel(level: number): string {
  return (RANKS.find((r) => level <= r.max) ?? RANKS[RANKS.length - 1]).name;
}
