import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

export type WeekPoint = {
  week_start: string;
  new_users: number;
  new_restaurants: number;
  new_reviews: number;
};

export type Totals = {
  users: number;
  restaurantsApproved: number;
  restaurantsTotal: number;
  reviews: number;
  avgRating: number | null;
};

export function useGrowthStats(weeks = 12) {
  return useQuery({
    queryKey: ["admin-growth-stats", weeks],
    queryFn: async (): Promise<WeekPoint[]> => {
      const { data, error } = await supabase.rpc("admin_growth_stats", { p_weeks: weeks });
      if (error) throw error;
      return (data ?? []) as WeekPoint[];
    },
  });
}

export function useTotals() {
  return useQuery({
    queryKey: ["admin-totals"],
    queryFn: async (): Promise<Totals> => {
      const [users, approved, total, reviews, rated] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("restaurants").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("moderation", "visible"),
        supabase.from("restaurants").select("rating_avg, rating_count").eq("status", "approved").gt("rating_count", 0),
      ]);
      const rows = rated.data ?? [];
      const totalReviewsWeighted = rows.reduce((s, r: any) => s + r.rating_avg * r.rating_count, 0);
      const totalRatingCount = rows.reduce((s, r: any) => s + r.rating_count, 0);
      return {
        users: users.count ?? 0,
        restaurantsApproved: approved.count ?? 0,
        restaurantsTotal: total.count ?? 0,
        reviews: reviews.count ?? 0,
        avgRating: totalRatingCount > 0 ? totalReviewsWeighted / totalRatingCount : null,
      };
    },
  });
}
