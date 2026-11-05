import { useMutation, useQuery, useQueryClient, useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionUser, supabase } from "@/lib/supabase";
import { uploadPostPhoto } from "@/lib/storage";
import type { TopicKey } from "@/lib/community/topics";

// Las tablas y funciones de Comunidad aún no están en lib/database.types.ts
// (se regeneran tras el `supabase db push`). Mientras tanto se usa el
// cliente sin tipos de tablas; las formas de datos están tipadas abajo.
const db = supabase as unknown as SupabaseClient;

export const PAGE_SIZE = 20;

/** Una fila del feed: un post o una reseña. Columnas de community_feed(). */
export type FeedItem = {
  kind: "post" | "review";
  id: string;
  createdAt: string;
  topic: TopicKey;
  body: string;
  rating: number | null;
  authorId: string;
  authorName: string | null;
  authorAvatar: string | null;
  authorLevel: number | null;
  asRestaurantId: string | null;
  asRestaurantName: string | null;
  asRestaurantLogo: string | null;
  restaurantId: string | null;
  restaurantName: string | null;
  restaurantCategory: string | null;
  restaurantZone: string | null;
  suggestedName: string | null;
  suggestedZone: string | null;
  categoryIds: number[];
  photoPaths: string[];
  likeCount: number;
  replyCount: number;
  viewerLiked: boolean;
};

export type FeedFilters = {
  topic?: TopicKey;
  categoryId?: number;
  restaurantId?: string;
  query?: string;
};

type FeedRow = {
  kind: "post" | "review";
  id: string;
  created_at: string;
  topic: TopicKey;
  body: string;
  rating: number | null;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  author_level: number | null;
  as_restaurant_id: string | null;
  as_restaurant_name: string | null;
  as_restaurant_logo: string | null;
  restaurant_id: string | null;
  restaurant_name: string | null;
  restaurant_category: string | null;
  restaurant_zone: string | null;
  suggested_name: string | null;
  suggested_zone: string | null;
  category_ids: number[] | null;
  photo_paths: string[] | null;
  like_count: number;
  reply_count: number;
  viewer_liked: boolean;
};

function toFeedItem(r: FeedRow): FeedItem {
  return {
    kind: r.kind,
    id: r.id,
    createdAt: r.created_at,
    topic: r.topic,
    body: r.body,
    rating: r.rating,
    authorId: r.author_id,
    authorName: r.author_name,
    authorAvatar: r.author_avatar,
    authorLevel: r.author_level,
    asRestaurantId: r.as_restaurant_id,
    asRestaurantName: r.as_restaurant_name,
    asRestaurantLogo: r.as_restaurant_logo,
    restaurantId: r.restaurant_id,
    restaurantName: r.restaurant_name,
    restaurantCategory: r.restaurant_category,
    restaurantZone: r.restaurant_zone,
    suggestedName: r.suggested_name,
    suggestedZone: r.suggested_zone,
    categoryIds: r.category_ids ?? [],
    photoPaths: r.photo_paths ?? [],
    likeCount: r.like_count,
    replyCount: r.reply_count,
    viewerLiked: r.viewer_liked,
  };
}

type Cursor = { at: string; id: string } | null;

export const feedKey = (filters: FeedFilters = {}) => ["community-feed", filters] as const;

async function fetchFeedPage(filters: FeedFilters, cursor: Cursor): Promise<FeedItem[]> {
  const { data, error } = await db.rpc("community_feed", {
    p_topic: filters.topic ?? null,
    p_category: filters.categoryId ?? null,
    p_restaurant: filters.restaurantId ?? null,
    p_query: filters.query?.trim() || null,
    p_before_at: cursor?.at ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: PAGE_SIZE,
  });
  if (error) throw error;
  return ((data ?? []) as FeedRow[]).map(toFeedItem);
}

export function useCommunityFeed(filters: FeedFilters = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: feedKey(filters),
    queryFn: ({ pageParam }) => fetchFeedPage(filters, pageParam),
    initialPageParam: null as Cursor,
    getNextPageParam: (last) =>
      last.length < PAGE_SIZE ? undefined : { at: last[last.length - 1].createdAt, id: last[last.length - 1].id },
    enabled,
  });
}

// ─── Un post y sus respuestas ───────────────────────────────────────────────

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: ["community-post", postId],
    enabled: !!postId && !postId.startsWith("pending-"),
    // null = oculto, retirado, borrado o de alguien que bloqueaste.
    queryFn: async (): Promise<FeedItem | null> => {
      const { data, error } = await db.rpc("community_feed", { p_post: postId, p_limit: 1 });
      if (error) throw error;
      const row = ((data ?? []) as FeedRow[])[0];
      return row ? toFeedItem(row) : null;
    },
  });
}

export type Reply = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string | null;
  authorAvatar: string | null;
  asRestaurantId: string | null;
  asRestaurantName: string | null;
  asRestaurantLogo: string | null;
  restaurantId: string | null;
  restaurantName: string | null;
  body: string;
  createdAt: string;
  pending?: boolean;
};

export const repliesKey = (postId: string) => ["community-replies", postId] as const;

export function usePostReplies(postId: string | undefined, blockedIds?: Set<string>) {
  return useQuery({
    queryKey: repliesKey(postId ?? ""),
    enabled: !!postId,
    queryFn: async (): Promise<Reply[]> => {
      const { data, error } = await db
        .from("post_replies")
        .select(
          "id, post_id, author_id, as_restaurant_id, restaurant_id, body, created_at, " +
            "author:profiles!post_replies_author_id_fkey(full_name, username, avatar_url), " +
            "as_restaurant:restaurants!post_replies_as_restaurant_id_fkey(name, logo_url), " +
            "restaurant:restaurants!post_replies_restaurant_id_fkey(name)",
        )
        .eq("post_id", postId!)
        .eq("moderation", "visible")
        .order("created_at", { ascending: true });
      if (error) throw error;
      type Row = {
        id: string;
        post_id: string;
        author_id: string;
        as_restaurant_id: string | null;
        restaurant_id: string | null;
        body: string;
        created_at: string;
        author: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
        as_restaurant: { name: string; logo_url: string | null } | null;
        restaurant: { name: string } | null;
      };
      return ((data ?? []) as unknown as Row[]).map((r) => ({
        id: r.id,
        postId: r.post_id,
        authorId: r.author_id,
        authorName: r.author?.full_name ?? r.author?.username ?? null,
        authorAvatar: r.author?.avatar_url ?? null,
        asRestaurantId: r.as_restaurant_id,
        asRestaurantName: r.as_restaurant?.name ?? null,
        asRestaurantLogo: r.as_restaurant?.logo_url ?? null,
        restaurantId: r.restaurant_id,
        restaurantName: r.restaurant?.name ?? null,
        body: r.body,
        createdAt: r.created_at,
      }));
    },
    select: (rows) => (blockedIds?.size ? rows.filter((r) => !blockedIds.has(r.authorId)) : rows),
  });
}

// ─── Ajustes globales ───────────────────────────────────────────────────────

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await db.from("app_settings").select("owner_posts_enabled").maybeSingle();
      if (error) throw error;
      return { ownerPostsEnabled: data?.owner_posts_enabled ?? false };
    },
  });
}

// ─── Escribir ───────────────────────────────────────────────────────────────

/** Mensaje del error de Supabase (ahí viene el código, p. ej. "post_rate_limited"). */
export function errorCode(e: unknown): string {
  return e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
}

type FeedPages = InfiniteData<FeedItem[], Cursor>;

/** Cambia una fila en todas las páginas de todos los feeds en caché. */
function patchFeedItem(qc: ReturnType<typeof useQueryClient>, id: string, fn: (it: FeedItem) => FeedItem) {
  qc.setQueriesData<FeedPages>({ queryKey: ["community-feed"] }, (old) =>
    old ? { ...old, pages: old.pages.map((page) => page.map((it) => (it.id === id ? fn(it) : it))) } : old,
  );
  qc.setQueriesData<FeedItem | null>({ queryKey: ["community-post", id] }, (old) => (old ? fn(old) : old));
}

export type NewPost = {
  clientId: string;
  topic: TopicKey;
  body: string;
  restaurantId?: string | null;
  restaurantName?: string | null;
  suggestedName?: string | null;
  suggestedZone?: string | null;
  categoryIds: number[];
  asRestaurantId?: string | null;
  photos: string[];
  onPhotoUploaded?: (done: number, total: number) => void;
};

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create-post"],
    mutationFn: async (p: NewPost) => {
      const { data: id, error } = await db.rpc("create_post", {
        p_client_id: p.clientId,
        p_topic: p.topic,
        p_body: p.body,
        p_restaurant_id: p.restaurantId ?? null,
        p_suggested_name: p.suggestedName ?? null,
        p_suggested_zone: p.suggestedZone ?? null,
        p_category_ids: p.categoryIds,
        p_as_restaurant_id: p.asRestaurantId ?? null,
      });
      if (error) throw error;
      const postId = id as string;

      if (p.photos.length > 0) {
        let done = 0;
        const rows = await Promise.all(
          p.photos.slice(0, 4).map(async (uri, i) => {
            const path = await uploadPostPhoto(postId, i, uri);
            p.onPhotoUploaded?.(++done, p.photos.length);
            return { post_id: postId, position: i, storage_path: path };
          }),
        );
        const { error: phErr } = await db.from("post_photos").upsert(rows, { onConflict: "post_id,position" });
        if (phErr) throw phErr;
      }
      return postId;
    },
    // El post propio aparece arriba al momento; si falla, se quita.
    onMutate: async (p) => {
      const { data } = await getSessionUser();
      const me = data.user;
      const optimistic: FeedItem = {
        kind: "post",
        id: `pending-${p.clientId}`,
        createdAt: new Date().toISOString(),
        topic: p.topic,
        body: p.body,
        rating: null,
        authorId: me?.id ?? "",
        authorName: (me?.user_metadata?.full_name as string | undefined) ?? null,
        authorAvatar: (me?.user_metadata?.avatar_url as string | undefined) ?? null,
        authorLevel: null,
        asRestaurantId: p.asRestaurantId ?? null,
        asRestaurantName: null,
        asRestaurantLogo: null,
        restaurantId: p.restaurantId ?? null,
        restaurantName: p.restaurantName ?? null,
        restaurantCategory: null,
        restaurantZone: null,
        suggestedName: p.suggestedName ?? null,
        suggestedZone: p.suggestedZone ?? null,
        categoryIds: p.categoryIds,
        photoPaths: [],
        likeCount: 0,
        replyCount: 0,
        viewerLiked: false,
      };
      await qc.cancelQueries({ queryKey: feedKey({}) });
      const prev = qc.getQueryData<FeedPages>(feedKey({}));
      if (prev) {
        qc.setQueryData<FeedPages>(feedKey({}), {
          ...prev,
          pages: [[optimistic, ...(prev.pages[0] ?? [])], ...prev.pages.slice(1)],
        });
      }
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(feedKey({}), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["community-feed"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCreateReply(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create-reply", postId],
    mutationFn: async ({
      body,
      restaurantId,
      asRestaurantId,
    }: {
      body: string;
      restaurantId?: string | null;
      restaurantName?: string | null;
      asRestaurantId?: string | null;
    }) => {
      const { data: u } = await getSessionUser();
      if (!u.user) throw new Error("not_authenticated");
      const { error } = await db.from("post_replies").insert({
        post_id: postId,
        author_id: u.user.id,
        body,
        restaurant_id: asRestaurantId ? null : (restaurantId ?? null),
        as_restaurant_id: asRestaurantId ?? null,
      });
      if (error) throw error;
    },
    // La respuesta aparece al instante; si falla, se quita.
    onMutate: async (v) => {
      const { data } = await getSessionUser();
      const me = data.user;
      await qc.cancelQueries({ queryKey: repliesKey(postId) });
      const prev = qc.getQueryData<Reply[]>(repliesKey(postId));
      const optimistic: Reply = {
        id: `pending-${Date.now()}`,
        postId,
        authorId: me?.id ?? "",
        authorName: (me?.user_metadata?.full_name as string | undefined) ?? null,
        authorAvatar: (me?.user_metadata?.avatar_url as string | undefined) ?? null,
        asRestaurantId: v.asRestaurantId ?? null,
        asRestaurantName: null,
        asRestaurantLogo: null,
        restaurantId: v.restaurantId ?? null,
        restaurantName: v.restaurantName ?? null,
        body: v.body,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      qc.setQueryData<Reply[]>(repliesKey(postId), [...(prev ?? []), optimistic]);
      patchFeedItem(qc, postId, (it) => ({ ...it, replyCount: it.replyCount + 1 }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(repliesKey(postId), ctx?.prev);
      patchFeedItem(qc, postId, (it) => ({ ...it, replyCount: Math.max(0, it.replyCount - 1) }));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: repliesKey(postId) });
      qc.invalidateQueries({ queryKey: ["community-post", postId] });
    },
  });
}

/**
 * Me gusta en una fila del feed. En reseñas es el "útil" de siempre
 * (review_helpful). Optimista y en fila, como el favorito.
 */
export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["toggle-like"],
    scope: { id: "toggle-like" },
    mutationFn: async ({ item, liked }: { item: Pick<FeedItem, "id" | "kind">; liked: boolean }) => {
      const { data: u } = await getSessionUser();
      if (!u.user) throw new Error("not_authenticated");
      const userId = u.user.id;
      if (item.kind === "review") {
        const q = liked
          ? supabase.from("review_helpful").delete().eq("user_id", userId).eq("review_id", item.id)
          : supabase.from("review_helpful").insert({ user_id: userId, review_id: item.id });
        const { error } = await q;
        if (error) throw error;
      } else {
        const q = liked
          ? db.from("post_likes").delete().eq("user_id", userId).eq("post_id", item.id)
          : db.from("post_likes").insert({ user_id: userId, post_id: item.id });
        const { error } = await q;
        if (error) throw error;
      }
    },
    onMutate: async ({ item, liked }) => {
      await qc.cancelQueries({ queryKey: ["community-feed"] });
      patchFeedItem(qc, item.id, (it) => ({
        ...it,
        viewerLiked: !liked,
        likeCount: Math.max(0, it.likeCount + (liked ? -1 : 1)),
      }));
    },
    onError: (_e, { item, liked }) => {
      patchFeedItem(qc, item.id, (it) => ({
        ...it,
        viewerLiked: liked,
        likeCount: Math.max(0, it.likeCount + (liked ? 1 : -1)),
      }));
    },
    onSettled: () => {
      if (qc.isMutating({ mutationKey: ["toggle-like"] }) > 1) return;
      qc.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });
}

function removeFromFeeds(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.setQueriesData<FeedPages>({ queryKey: ["community-feed"] }, (old) =>
    old ? { ...old, pages: old.pages.map((page) => page.filter((it) => it.id !== id)) } : old,
  );
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await db.from("posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onMutate: (postId) => removeFromFeeds(qc, postId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["community-feed"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });
}

export function useDeleteReply(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await db.from("post_replies").delete().eq("id", replyId);
      if (error) throw error;
    },
    onMutate: async (replyId) => {
      const prev = qc.getQueryData<Reply[]>(repliesKey(postId));
      qc.setQueryData<Reply[]>(repliesKey(postId), (prev ?? []).filter((r) => r.id !== replyId));
      patchFeedItem(qc, postId, (it) => ({ ...it, replyCount: Math.max(0, it.replyCount - 1) }));
      return { prev };
    },
    onError: (_e, _id, ctx) => qc.setQueryData(repliesKey(postId), ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: repliesKey(postId) });
      qc.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });
}

export function useReportPost() {
  return useMutation({
    mutationFn: async ({
      postId,
      replyId,
      reason,
      note,
    }: {
      postId?: string;
      replyId?: string;
      reason: string;
      note?: string;
    }) => {
      const { data: u } = await getSessionUser();
      if (!u.user) throw new Error("not_authenticated");
      const { error } = await db.from("post_reports").insert({
        post_id: postId ?? null,
        reply_id: replyId ?? null,
        reporter_id: u.user.id,
        reason,
        note: note?.trim() || null,
      });
      // Reportar dos veces lo mismo no es un error para la persona.
      if (error && error.code !== "23505") throw error;
    },
  });
}
