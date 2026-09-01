import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RestaurantCategory } from '@/lib/queries/restaurants';

export type FeedRestaurant = {
  id: string;
  name: string;
  address: string | null;
  rating_avg: number;
  rating_count: number;
  promo_text: string | null;
  cover_url: string | null;
  categories: RestaurantCategory[];
};

export type FeedItem = {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  restaurant: FeedRestaurant;
  author: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    level: number;
  } | null;
};

function mapCategories(rc: any): RestaurantCategory[] {
  return (rc ?? []).map((row: any) => row.categories).filter(Boolean);
}

// ─── Home feed: recent reviews ───────────────────────────────────────────────

async function fetchFeed(): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `id, rating, body, created_at,
       restaurant:restaurants (
         id, name, address, rating_avg, rating_count, promo_text, cover_url,
         restaurant_categories ( categories ( slug, label, icon ) )
       ),
       author:profiles!author_id ( username, full_name, avatar_url, level )`,
    )
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) throw error;

  const mapped: FeedItem[] = (data ?? [])
    .filter((r: any) => r.restaurant)
    .map((r: any) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      author: r.author ?? null,
      restaurant: {
        id: r.restaurant.id,
        name: r.restaurant.name,
        address: r.restaurant.address,
        rating_avg: r.restaurant.rating_avg,
        rating_count: r.restaurant.rating_count,
        promo_text: r.restaurant.promo_text ?? null,
        cover_url: r.restaurant.cover_url ?? null,
        categories: mapCategories(r.restaurant.restaurant_categories),
      },
    }));

  // Una card por local: el rank más reciente (data ya viene ordenada desc).
  const seen = new Set<string>();
  return mapped.filter((item) => {
    if (seen.has(item.restaurant.id)) return false;
    seen.add(item.restaurant.id);
    return true;
  });
}

export function useHomeFeed() {
  return useQuery({ queryKey: ['home-feed'], queryFn: fetchFeed });
}

// ─── Favorites ──────────────────────────────────────────────────────────────

export type FavoriteRestaurant = FeedRestaurant & { favorited_at: string };

async function fetchFavorites(): Promise<FavoriteRestaurant[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(
      `created_at,
       restaurant:restaurants (
         id, name, address, rating_avg, rating_count, promo_text, cover_url,
         restaurant_categories ( categories ( slug, label, icon ) )
       )`,
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter((f: any) => f.restaurant)
    .map((f: any) => ({
      id: f.restaurant.id,
      name: f.restaurant.name,
      address: f.restaurant.address,
      rating_avg: f.restaurant.rating_avg,
      rating_count: f.restaurant.rating_count,
      promo_text: f.restaurant.promo_text ?? null,
      cover_url: f.restaurant.cover_url ?? null,
      categories: mapCategories(f.restaurant.restaurant_categories),
      favorited_at: f.created_at,
    }));
}

export function useFavorites() {
  return useQuery({ queryKey: ['favorites'], queryFn: fetchFavorites });
}

export function useFavoriteIds() {
  return useQuery({
    queryKey: ['favorite-ids'],
    queryFn: async () => {
      const { data, error } = await supabase.from('favorites').select('restaurant_id');
      if (error) throw error;
      return new Set((data ?? []).map((f) => f.restaurant_id));
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ restaurantId, favorited }: { restaurantId: string; favorited: boolean }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error('No autenticado');
      const userId = userData.user.id;

      if (favorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('restaurant_id', restaurantId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: userId, restaurant_id: restaurantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorite-ids'] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
