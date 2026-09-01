import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type RestaurantCategory = {
  slug: string;
  label: string;
  icon: string;
};

export type RestaurantDetail = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  whatsapp: string | null;
  instagram: string | null;
  phone: string | null;
  price_level: number | null;
  logo_url: string | null;
  cover_url: string | null;
  menu_pdf_url: string | null;
  hours: unknown;
  is_active: boolean;
  rating_avg: number;
  rating_count: number;
  categories: RestaurantCategory[];
};

export function restaurantKeys(id: string) {
  return ['restaurant', id] as const;
}

async function fetchRestaurant(id: string): Promise<RestaurantDetail> {
  const { data, error } = await supabase
    .from('restaurants')
    .select(
      `id, name, description, address, whatsapp, instagram, phone,
       price_level, logo_url, cover_url, menu_pdf_url, hours, is_active,
       rating_avg, rating_count,
       restaurant_categories ( categories ( slug, label, icon ) )`,
    )
    .eq('id', id)
    .single();

  if (error) throw error;

  const categories: RestaurantCategory[] = (data.restaurant_categories ?? [])
    .map((rc: any) => rc.categories)
    .filter(Boolean);

  const { restaurant_categories, ...rest } = data as any;
  return { ...(rest as Omit<RestaurantDetail, 'categories'>), categories };
}

export function useRestaurant(id: string) {
  return useQuery({
    queryKey: restaurantKeys(id),
    queryFn: () => fetchRestaurant(id),
    enabled: !!id,
  });
}
