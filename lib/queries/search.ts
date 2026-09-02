import { parseHours, type Hours } from "@/lib/hours";
import type { RestaurantCategory } from "@/lib/queries/restaurants";
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
  categories: RestaurantCategory[];
};

const BASE_COLS = `id, name, address, price_level, rating_avg, rating_count, cover_url, hours,
       restaurant_categories ( categories ( slug, label, icon ) )`;

async function fetchActiveRestaurants(): Promise<SearchResult[]> {
  // latitude/longitude land in a later migration; fall back gracefully if absent.
  // `as any` on the select: the generated types don't know the columns yet.
  let { data, error }: { data: any; error: any } = await (supabase
    .from("restaurants")
    .select(`${BASE_COLS}, latitude, longitude`) as any)
    .eq("is_active", true);

  if (error) {
    ({ data, error } = await supabase
      .from("restaurants")
      .select(BASE_COLS)
      .eq("is_active", true));
  }
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
    categories: (r.restaurant_categories ?? [])
      .map((rc: any) => rc.categories)
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
