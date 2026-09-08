import { parseHours, type Hours } from "@/lib/hours";
import type { RestaurantAmenity, RestaurantCategory } from "@/lib/queries/restaurants";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type SearchResult = {
  id: string;
  name: string;
  address: string | null;
  price_level: number | null;
  rating_avg: number;
  rating_count: number;
  cover_url: string | null;
  hours: Hours | null;
  lat: number | null;
  lng: number | null;
  boost_until: string | null;
  categories: RestaurantCategory[];
  amenities: RestaurantAmenity[];
};

async function fetchActiveRestaurants(): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      `id, name, address, price_level, rating_avg, rating_count, cover_url, hours,
       latitude, longitude, boost_until,
       restaurant_categories ( categories ( slug, label, icon ) ),
       restaurant_amenities ( amenities ( id, slug, label, icon ) )`,
    )
    .eq("is_active", true)
    .eq("status", "approved");

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    price_level: r.price_level,
    rating_avg: r.rating_avg,
    rating_count: r.rating_count,
    cover_url: r.cover_url ?? null,
    hours: parseHours(r.hours),
    lat: typeof r.latitude === "number" ? r.latitude : null,
    lng: typeof r.longitude === "number" ? r.longitude : null,
    boost_until: r.boost_until ?? null,
    categories: (r.restaurant_categories ?? [])
      .map((rc: any) => rc.categories)
      .filter(Boolean),
    amenities: (r.restaurant_amenities ?? [])
      .map((ra: any) => ra.amenities)
      .filter(Boolean),
  }));
}

// Small-city dataset: fetch active restaurants once, filter/sort on the client.
export function useRestaurantSearch() {
  return useQuery({
    queryKey: ["restaurant-search"],
    queryFn: fetchActiveRestaurants,
    staleTime: 2 * 60_000,
  });
}
