import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RestaurantCategory } from '@/lib/queries/restaurants';

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
  is_active: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  categories: RestaurantCategory[];
};

export const ownerRestaurantKey = ['owner-restaurant'] as const;

async function fetchMyRestaurant(): Promise<OwnerRestaurant | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('restaurants')
    .select(
      `id, name, description, address, phone, whatsapp, instagram, price_level,
       logo_url, cover_url, menu_pdf_url, promo_text, is_active,
       rating_avg, rating_count, created_at,
       restaurant_categories ( categories ( slug, label, icon ) )`,
    )
    .eq('owner_id', uid)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { restaurant_categories, ...rest } = data as any;
  return {
    ...(rest as Omit<OwnerRestaurant, 'categories'>),
    categories: (restaurant_categories ?? []).map((rc: any) => rc.categories).filter(Boolean),
  };
}

export function useMyRestaurant() {
  return useQuery({ queryKey: ownerRestaurantKey, queryFn: fetchMyRestaurant });
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
}>;

export function useUpdateMyRestaurant(restaurantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: OwnerRestaurantPatch) => {
      if (!restaurantId) throw new Error('Sin restaurante');
      const { error } = await supabase.from('restaurants').update(patch).eq('id', restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerRestaurantKey });
    },
  });
}
