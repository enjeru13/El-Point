import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReportReason } from "@/lib/queries/reviews";

export type ModerationReport = {
  reason: ReportReason;
  note: string | null;
  created_at: string;
};

export type ModerationItem = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  rating: number;
  body: string;
  created_at: string;
  moderation: "visible" | "hidden" | "removed";
  author_name: string;
  reports: ModerationReport[];
};

const KEY = ["moderation-queue"] as const;

async function fetchQueue(): Promise<ModerationItem[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id, restaurant_id, rating, body, created_at, moderation,
       restaurant:restaurants!restaurant_id ( name ),
       author:profiles!author_id ( username, full_name ),
       review_reports ( reason, note, created_at )`,
    )
    .eq("moderation", "hidden")
    .order("moderated_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    restaurant_id: r.restaurant_id,
    restaurant_name: r.restaurant?.name ?? "Local",
    rating: r.rating,
    body: r.body,
    created_at: r.created_at,
    moderation: r.moderation,
    author_name: r.author?.username
      ? `@${r.author.username}`
      : (r.author?.full_name ?? "Anónimo"),
    reports: ((r.review_reports ?? []) as any[])
      .map((rep) => ({
        reason: rep.reason as ReportReason,
        note: rep.note ?? null,
        created_at: rep.created_at,
      }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
}

export function useModerationQueue(enabled: boolean) {
  return useQuery({ queryKey: KEY, queryFn: fetchQueue, enabled });
}

/** Admin action: 'approve' restores the review, 'remove' takes it down for good. */
export function useResolveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reviewId,
      action,
    }: {
      reviewId: string;
      action: "approve" | "remove";
    }) => {
      const { error } = await supabase
        .from("reviews")
        .update({
          moderation: action === "approve" ? "visible" : "removed",
          moderated_at: new Date().toISOString(),
        })
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["restaurant"] });
      qc.invalidateQueries({ queryKey: ["home-feed"] });
      qc.invalidateQueries({ queryKey: ["restaurant-search"] });
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["nearby"] });
    },
  });
}
