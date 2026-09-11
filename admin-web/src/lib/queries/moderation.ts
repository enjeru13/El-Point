import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { ReviewReportReason } from "../reasons";

export type ModerationReport = {
  reason: ReviewReportReason;
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
       review_reports!inner ( reason, note, created_at )`,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((r: any) => ({
      id: r.id,
      restaurant_id: r.restaurant_id,
      restaurant_name: r.restaurant?.name ?? "Local",
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      moderation: r.moderation,
      author_name: r.author?.username ? `@${r.author.username}` : (r.author?.full_name ?? "Anónimo"),
      reports: ((r.review_reports ?? []) as any[])
        .map((rep) => ({
          reason: rep.reason as ReviewReportReason,
          note: rep.note ?? null,
          created_at: rep.created_at,
        }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }))
    .sort(
      (a, b) =>
        b.reports.length - a.reports.length ||
        (b.moderation === "hidden" ? 1 : 0) - (a.moderation === "hidden" ? 1 : 0),
    );
}

export function useModerationQueue() {
  return useQuery({ queryKey: KEY, queryFn: fetchQueue });
}

/** Admin action: 'approve' restores the review, 'remove' takes it down for good. */
export function useResolveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, action }: { reviewId: string; action: "approve" | "remove" }) => {
      const { error } = await supabase
        .from("reviews")
        .update({
          moderation: action === "approve" ? "visible" : "removed",
          moderated_at: new Date().toISOString(),
        })
        .eq("id", reviewId);
      if (error) throw error;

      const { error: clearErr } = await supabase.from("review_reports").delete().eq("review_id", reviewId);
      if (clearErr) throw clearErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    },
  });
}
