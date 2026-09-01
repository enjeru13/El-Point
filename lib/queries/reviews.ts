import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { restaurantKeys } from '@/lib/queries/restaurants';
import { uploadReviewPhoto, reviewPhotoUrl } from '@/lib/storage';

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
  photos: string[];
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
       author:profiles!author_id ( id, username, full_name, avatar_url, level ),
       review_photos ( storage_path, position )`,
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
    photos: ((r.review_photos ?? []) as any[])
      .sort((a, b) => a.position - b.position)
      .map((p) => reviewPhotoUrl(p.storage_path)),
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
    mutationFn: async ({
      rating,
      body,
      photoUris = [],
    }: {
      rating: number;
      body: string;
      photoUris?: string[];
    }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error('No autenticado');

      const { data: review, error } = await supabase
        .from('reviews')
        .insert({ restaurant_id: restaurantId, author_id: userData.user.id, rating, body })
        .select('id')
        .single();
      if (error) throw error;

      if (photoUris.length > 0 && review) {
        const rows: { review_id: string; storage_path: string; position: number }[] = [];
        for (let i = 0; i < photoUris.length; i++) {
          const path = await uploadReviewPhoto(review.id, i, photoUris[i]);
          rows.push({ review_id: review.id, storage_path: path, position: i });
        }
        await supabase.from('review_photos').insert(rows);
      }
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
