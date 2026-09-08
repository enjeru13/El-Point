import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type NearbyRestaurant = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  price_level: number | null;
  rating_avg: number;
  rating_count: number;
  cover_url: string | null;
  logo_url: string | null;
  boost_until: string | null;
  distance_m: number;
};

export function useNearby(
  origin: { latitude: number; longitude: number } | null,
  radiusKm = 5,
  category?: string | null,
) {
  return useQuery({
    queryKey: [
      "nearby",
      origin ? Number(origin.latitude.toFixed(4)) : null,
      origin ? Number(origin.longitude.toFixed(4)) : null,
      radiusKm,
      category ?? null,
    ],
    enabled: !!origin,
    queryFn: async (): Promise<NearbyRestaurant[]> => {
      const { data, error } = await supabase.rpc("nearby_restaurants", {
        user_lat: origin!.latitude,
        user_lng: origin!.longitude,
        radius_km: radiusKm,
        filter_category: category ?? undefined,
      });
      if (error) throw error;
      return (data ?? []) as NearbyRestaurant[];
    },
  });
}

export type NearbyAmenity = { slug: string; label: string; icon: string };

// The RPC does not return amenities; this builds restaurant_id -> amenity[].
export function useRestaurantAmenitiesMap() {
  return useQuery({
    queryKey: ["restaurant-amenities-map"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_amenities")
        .select("restaurant_id, amenities ( slug, label, icon )");
      if (error) throw error;
      const m = new Map<string, NearbyAmenity[]>();
      for (const row of (data ?? []) as any[]) {
        const a = row.amenities;
        if (!a) continue;
        const list = m.get(row.restaurant_id) ?? [];
        list.push({ slug: a.slug, label: a.label, icon: a.icon });
        m.set(row.restaurant_id, list);
      }
      return m;
    },
  });
}

// The RPC does not return categories; this builds restaurant_id -> icon.
export function useRestaurantIcons() {
  return useQuery({
    queryKey: ["restaurant-icons"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_categories")
        .select("restaurant_id, categories ( icon )");
      if (error) throw error;
      const m = new Map<string, string>();
      for (const row of (data ?? []) as any[]) {
        const icon = row.categories?.icon;
        if (icon && !m.has(row.restaurant_id)) m.set(row.restaurant_id, icon);
      }
      return m;
    },
  });
}
