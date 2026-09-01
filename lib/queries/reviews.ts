import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { restaurantKeys } from '@/lib/queries/restaurants';

export type ReviewAuthor = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
};

export type Review = {
  id: string;
  restaurant_id: string;
  rating: number;
  body: string;
  helpful_count: number;
  created_at: string;
  author: ReviewAuthor | null;
  viewer_marked_helpful: boolean;
};

export function reviewKeys(restaurantId: string) {
  return ['reviews', restaurantId] as const;
}

async function fetchReviews(restaurantId: string): Promise<Review[]> {
  const { data: userData } = await supabase.auth.getUser();
  const viewerId = userData.user?.id ?? null;

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `id, restaurant_id, rating, body, helpful_count, created_at,
       author:profiles!author_id ( id, username, full_name, avatar_url, level )`,
    )
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  let markedIds = new Set<string>();
  if (viewerId && data.length > 0) {
    const { data: marks } = await supabase
      .from('review_helpful')
      .select('review_id')
      .eq('user_id', viewerId)
      .in(
        'review_id',
        data.map((r) => r.id),
      );
    markedIds = new Set((marks ?? []).map((m) => m.review_id));
  }

  return data.map((r: any) => ({
    id: r.id,
    restaurant_id: r.restaurant_id,
    rating: r.rating,
    body: r.body,
    helpful_count: r.helpful_count,
    created_at: r.created_at,
    author: r.author ?? null,
    viewer_marked_helpful: markedIds.has(r.id),
  }));
}

export function useReviews(restaurantId: string) {
  return useQuery({
    queryKey: reviewKeys(restaurantId),
    queryFn: () => fetchReviews(restaurantId),
    enabled: !!restaurantId,
  });
}

export function useSubmitReview(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rating, body }: { rating: number; body: string }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error('No autenticado');

      const { error } = await supabase.from('reviews').insert({
        restaurant_id: restaurantId,
        author_id: userData.user.id,
        rating,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys(restaurantId) });
      qc.invalidateQueries({ queryKey: restaurantKeys(restaurantId) });
    },
  });
}

export function useToggleHelpful(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, marked }: { reviewId: string; marked: boolean }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error('No autenticado');
      const userId = userData.user.id;

      if (marked) {
        const { error } = await supabase
          .from('review_helpful')
          .delete()
          .eq('user_id', userId)
          .eq('review_id', reviewId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('review_helpful')
          .insert({ user_id: userId, review_id: reviewId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys(restaurantId) });
    },
  });
}
