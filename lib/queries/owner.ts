import { parseHours, type Hours } from "@/lib/hours";
import type { RestaurantAmenity, RestaurantCategory } from "@/lib/queries/restaurants";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type OwnerRestaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  price_level: number | null;
  logo_url: string | null;
  cover_url: string | null;
  menu_pdf_url: string | null;
  promo_text: string | null;
  hours: Hours | null;
  is_active: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
  status_reason: string | null;
  submitted_at: string;
  verification_photo_path: string | null;
  rif: string | null;
  rating_avg: number;
  rating_count: number;
  boost_until: string | null;
  founder_rank: number | null;
  paid_until: string | null;
  host_streak_weeks: number;
  created_at: string;
  ghost_kitchen: boolean;
  zone_label: string | null;
  lat: number | null;
  lng: number | null;
  categories: RestaurantCategory[];
  amenities: RestaurantAmenity[];
};

export const ownerRestaurantKey = ["owner-restaurant"] as const;

async function fetchMyRestaurant(): Promise<OwnerRestaurant | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from("restaurants")
    .select(
      `id, name, description, address, phone, whatsapp, instagram, price_level,
       logo_url, cover_url, menu_pdf_url, promo_text, hours, is_active,
       status, status_reason, submitted_at, verification_photo_path, rif,
       rating_avg, rating_count, boost_until, founder_rank, paid_until, host_streak_weeks, created_at,
       ghost_kitchen, zone_label, latitude, longitude,
       restaurant_categories ( categories ( slug, label, icon ) ),
       restaurant_amenities ( amenities ( id, slug, label, icon ) )`,
    )
    .eq("owner_id", uid)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { restaurant_categories, restaurant_amenities, hours, latitude, longitude, ...rest } = data as any;
  return {
    ...(rest as Omit<OwnerRestaurant, "categories" | "amenities" | "hours" | "lat" | "lng">),
    hours: parseHours(hours),
    lat: typeof latitude === "number" ? latitude : null,
    lng: typeof longitude === "number" ? longitude : null,
    categories: (restaurant_categories ?? [])
      .map((rc: any) => rc.categories)
      .filter(Boolean),
    amenities: (restaurant_amenities ?? [])
      .map((ra: any) => ra.amenities)
      .filter(Boolean),
  };
}

export function useMyRestaurant() {
  return useQuery({ queryKey: ownerRestaurantKey, queryFn: fetchMyRestaurant });
}

/** Owner resubmits a rejected listing after fixing it. */
export function useResubmitRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (restaurantId: string) => {
      const { error } = await supabase.rpc("resubmit_restaurant", {
        p_restaurant_id: restaurantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerRestaurantKey });
    },
  });
}

export type OwnerRestaurantPatch = Partial<{
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  price_level: number | null;
  promo_text: string | null;
  is_active: boolean;
  logo_url: string | null;
  cover_url: string | null;
  menu_pdf_url: string | null;
  hours: Hours;
  rif: string | null;
  verification_photo_path: string | null;
  ghost_kitchen: boolean;
  zone_label: string | null;
}>;

export function useUpdateMyRestaurant(restaurantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: OwnerRestaurantPatch) => {
      if (!restaurantId) throw new Error("Sin restaurante");
      const { error } = await supabase
        .from("restaurants")
        .update(patch)
        .eq("id", restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerRestaurantKey });
    },
  });
}

/** Pin opcional para cocinas fantasma que registraron solo zona en texto --
 *  `null` lo quita. RPC en vez de un plain update porque `location` es
 *  geography, necesita construirse con PostGIS. */
export function useSetRestaurantZoneLocation(restaurantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (coords: { lat: number; lng: number } | null) => {
      if (!restaurantId) throw new Error("Sin restaurante");
      const { error } = await supabase.rpc("set_restaurant_zone_location", {
        p_restaurant_id: restaurantId,
        // null quita el pin (la función lo acepta; los tipos generados no lo saben)
        p_lat: (coords?.lat ?? null) as number,
        p_lng: (coords?.lng ?? null) as number,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerRestaurantKey });
    },
  });
}

/** Replaces the restaurant's full amenity set atomically (server-side RPC). */
export function useUpdateRestaurantAmenities(restaurantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amenityIds: number[]) => {
      if (!restaurantId) throw new Error("Sin restaurante");
      const { error } = await supabase.rpc("set_restaurant_amenities", {
        p_restaurant_id: restaurantId,
        p_amenity_ids: amenityIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerRestaurantKey });
    },
  });
}
