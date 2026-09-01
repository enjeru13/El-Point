import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RestaurantCategory } from '@/lib/queries/restaurants';
import { parseHours, type Hours } from '@/lib/hours';

export type SearchResult = {
  id: string;
  name: string;
  address: string | null;
  price_level: number | null;
  rating_avg: number;
  rating_count: number;
  cover_url: string | null;
  hours: Hours | null;
  categories: RestaurantCategory[];
};

async function fetchActiveRestaurants(): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(
      `id, name, address, price_level, rating_avg, rating_count, cover_url, hours,
       restaurant_categories ( categories ( slug, label, icon ) )`,
    )
    .eq('is_active', true);

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
    categories: (r.restaurant_categories ?? []).map((rc: any) => rc.categories).filter(Boolean),
  }));
}

// Small-city dataset: fetch active restaurants once, filter/sort on the client.
export function useRestaurantSearch() {
  return useQuery({
    queryKey: ['restaurant-search'],
    queryFn: fetchActiveRestaurants,
    staleTime: 2 * 60_000,
  });
}
