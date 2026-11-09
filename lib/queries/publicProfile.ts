import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type PublicProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  xp: number;
  level: number;
  rank_count: number;
  missions_done: number;
  post_count: number;
};

/** Perfil de otra persona (null si no está disponible: bloqueo o veto). */
export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["public-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PublicProfile | null> => {
      const { data, error } = await supabase.rpc("get_public_profile", { p_user_id: userId! });
      if (error) throw error;
      return (data as PublicProfile | null) ?? null;
    },
  });
}

export type ProfilePost = { id: string; topic: string; body: string; createdAt: string; likeCount: number; replyCount: number };

export function useUserPosts(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-posts", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProfilePost[]> => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, topic, body, created_at, like_count, reply_count")
        .eq("author_id", userId!)
        .is("as_restaurant_id", null)
        .eq("moderation", "visible")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        topic: p.topic,
        body: p.body,
        createdAt: p.created_at,
        likeCount: p.like_count,
        replyCount: p.reply_count,
      }));
    },
  });
}

export type ProfileReview = { id: string; rating: number; body: string | null; createdAt: string; restaurantId: string; restaurantName: string };

export function useUserReviews(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-reviews", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProfileReview[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, body, created_at, restaurant_id, restaurant:restaurants(name)")
        .eq("author_id", userId!)
        .eq("moderation", "visible")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        createdAt: r.created_at,
        restaurantId: r.restaurant_id,
        restaurantName: r.restaurant?.name ?? "Local",
      }));
    },
  });
}

/** Id de un usuario por su @nombre (para tocar una mención). */
export async function resolveUsername(username: string): Promise<string | null> {
  const { data } = await supabase.rpc("search_mention_users", { p_query: username, p_post_id: undefined as any });
  const hit = (data ?? []).find((u: { username: string | null }) => u.username?.toLowerCase() === username.toLowerCase());
  return hit?.id ?? null;
}

export function useMentionSuggestions(query: string | null, postId?: string) {
  return useQuery({
    queryKey: ["mention-suggest", query, postId],
    enabled: query !== null,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_mention_users", {
        p_query: query ?? "",
        p_post_id: (postId ?? undefined) as any,
      });
      if (error) throw error;
      return (data ?? []) as { id: string; username: string; avatar_url: string | null }[];
    },
  });
}
