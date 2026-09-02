import { restaurantKeys } from "@/lib/queries/restaurants";
import { reviewPhotoUrl, uploadReviewPhoto } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  updated_at: string;
  moderation: "visible" | "hidden" | "removed";
  author: ReviewAuthor | null;
  viewer_marked_helpful: boolean;
  photos: string[];
  reply: { body: string; created_at: string; updated_at: string } | null;
};

export type ReportReason = "offensive" | "spam" | "false" | "other";

export const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: "offensive", label: "Ofensiva o con insultos" },
  { key: "spam", label: "Spam o publicidad" },
  { key: "false", label: "Información falsa" },
  { key: "other", label: "Otro motivo" },
];

// Cuánto tiempo tras publicar puede el autor editar su reseña.
export const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function canEditReview(r: Pick<Review, "created_at">): boolean {
  return Date.now() - new Date(r.created_at).getTime() < REVIEW_EDIT_WINDOW_MS;
}

export function reviewKeys(restaurantId: string) {
  return ["reviews", restaurantId] as const;
}

async function fetchReviews(restaurantId: string): Promise<Review[]> {
  const { data: userData } = await supabase.auth.getUser();
  const viewerId = userData.user?.id ?? null;

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id, restaurant_id, rating, body, helpful_count, created_at, updated_at, moderation,
       author:profiles!author_id ( id, username, full_name, avatar_url, level ),
       review_photos ( storage_path, position ),
       review_replies ( body, created_at, updated_at )`,
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  let markedIds = new Set<string>();
  if (viewerId && data.length > 0) {
    const { data: marks } = await supabase
      .from("review_helpful")
      .select("review_id")
      .eq("user_id", viewerId)
      .in(
        "review_id",
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
    updated_at: r.updated_at ?? r.created_at,
    moderation: (r.moderation ?? "visible") as Review["moderation"],
    author: r.author ?? null,
    viewer_marked_helpful: markedIds.has(r.id),
    photos: ((r.review_photos ?? []) as any[])
      .sort((a, b) => a.position - b.position)
      .map((p) => reviewPhotoUrl(p.storage_path)),
    reply:
      (Array.isArray(r.review_replies)
        ? r.review_replies[0]
        : r.review_replies) ?? null,
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
      if (userErr || !userData.user)
        throw userErr ?? new Error("No autenticado");

      const { data: review, error } = await supabase
        .from("reviews")
        .insert({
          restaurant_id: restaurantId,
          author_id: userData.user.id,
          rating,
          body,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (photoUris.length > 0 && review) {
        const rows = await Promise.all(
          photoUris.map(async (uri, i) => ({
            review_id: review.id,
            storage_path: await uploadReviewPhoto(review.id, i, uri),
            position: i,
          })),
        );
        await supabase.from("review_photos").insert(rows);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys(restaurantId) });
      qc.invalidateQueries({ queryKey: restaurantKeys(restaurantId) });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["my-reviews"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      // rating_avg changed → refresh every surface that shows it
      qc.invalidateQueries({ queryKey: ["home-feed"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["nearby"] });
      qc.invalidateQueries({ queryKey: ["restaurant-search"] });
    },
  });
}

// Refrescos tras crear/editar/borrar una reseña (rating_avg cambia en todos lados).
function invalidateAfterReviewChange(
  qc: ReturnType<typeof useQueryClient>,
  restaurantId: string,
) {
  qc.invalidateQueries({ queryKey: reviewKeys(restaurantId) });
  qc.invalidateQueries({ queryKey: restaurantKeys(restaurantId) });
  qc.invalidateQueries({ queryKey: ["my-profile"] });
  qc.invalidateQueries({ queryKey: ["my-reviews"] });
  qc.invalidateQueries({ queryKey: ["home-feed"] });
  qc.invalidateQueries({ queryKey: ["favorites"] });
  qc.invalidateQueries({ queryKey: ["nearby"] });
  qc.invalidateQueries({ queryKey: ["restaurant-search"] });
}

export function useUpdateReview(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reviewId,
      rating,
      body,
    }: {
      reviewId: string;
      rating: number;
      body: string;
    }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user)
        throw userErr ?? new Error("No autenticado");
      const { error } = await supabase
        .from("reviews")
        .update({ rating, body: body.trim() })
        .eq("id", reviewId)
        .eq("author_id", userData.user.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterReviewChange(qc, restaurantId),
  });
}

export function useDeleteReview(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user)
        throw userErr ?? new Error("No autenticado");
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId)
        .eq("author_id", userData.user.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAfterReviewChange(qc, restaurantId),
  });
}

export function useReportReview(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reviewId,
      reason,
      note,
    }: {
      reviewId: string;
      reason: ReportReason;
      note?: string;
    }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user)
        throw userErr ?? new Error("No autenticado");
      const { error } = await supabase.from("review_reports").insert({
        review_id: reviewId,
        reporter_id: userData.user.id,
        reason,
        note: note?.trim() ? note.trim() : null,
      });
      if (error) {
        if (error.code === "23505")
          throw new Error("Ya reportaste esta reseña.");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys(restaurantId) });
      qc.invalidateQueries({ queryKey: restaurantKeys(restaurantId) });
    },
  });
}

export function useDeleteReply(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user)
        throw userErr ?? new Error("No autenticado");
      const { error } = await supabase
        .from("review_replies")
        .delete()
        .eq("review_id", reviewId)
        .eq("author_id", userData.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys(restaurantId) });
    },
  });
}

export function useReplyToReview(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reviewId,
      body,
    }: {
      reviewId: string;
      body: string;
    }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user)
        throw userErr ?? new Error("No autenticado");
      const { error } = await supabase.from("review_replies").upsert(
        {
          review_id: reviewId,
          author_id: userData.user.id,
          body: body.trim(),
        },
        { onConflict: "review_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys(restaurantId) });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useToggleHelpful(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reviewId,
      marked,
    }: {
      reviewId: string;
      marked: boolean;
    }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user)
        throw userErr ?? new Error("No autenticado");
      const userId = userData.user.id;

      if (marked) {
        const { error } = await supabase
          .from("review_helpful")
          .delete()
          .eq("user_id", userId)
          .eq("review_id", reviewId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("review_helpful")
          .insert({ user_id: userId, review_id: reviewId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys(restaurantId) });
    },
  });
}
