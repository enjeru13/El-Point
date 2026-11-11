import { useMutation, useQuery, useQueryClient, useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { getSessionUser, supabase } from "@/lib/supabase";
import { uploadPostPhoto } from "@/lib/storage";
import type { TopicKey } from "@/lib/community/topics";

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
  poll: PollState | null;
  /** Reseñas: su id real (en el detalle de un hilo, `id` es el del post-hilo). */
  reviewId: string | null;
  /** Reseñas: el post-hilo donde cuelgan las respuestas, si ya lo tiene. */
  threadPostId: string | null;
};

export type PollOption = { id: string; label: string | null; restaurant: { id: string; name: string } | null; votes: number | null };
export type PollState = {
  closes_at: string;
  closed: boolean;
  total: number;
  my_option: string | null;
  options: PollOption[];
};

export type NewPollOption = { label: string } | { restaurantId: string; name: string };
export type NewPoll = { days: 1 | 3 | 7; options: NewPollOption[] };

/** Encuestas de varias filas del feed, en una sola llamada. */
async function attachPolls(items: FeedItem[]): Promise<FeedItem[]> {
  const ids = items.filter((i) => i.kind === "post").map((i) => i.id);
  if (!ids.length) return items;
  const { data, error } = await supabase.rpc("poll_states", { p_post_ids: ids });
  if (error) return items;
  const map = (data ?? {}) as Record<string, PollState>;
  return items.map((i) => (map[i.id] ? { ...i, poll: map[i.id] } : i));
}

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
  review_id: string | null;
  thread_post_id: string | null;
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
    poll: null,
    reviewId: r.review_id ?? (r.kind === "review" ? r.id : null),
    threadPostId: r.thread_post_id,
  };
}

type Cursor = { at: string; id: string } | null;

export const feedKey = (filters: FeedFilters = {}) => ["community-feed", filters] as const;

async function fetchFeedPage(filters: FeedFilters, cursor: Cursor): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc("community_feed", {
    p_topic: filters.topic ?? undefined,
    p_category: filters.categoryId ?? undefined,
    p_restaurant: filters.restaurantId ?? undefined,
    p_query: filters.query?.trim() || undefined,
    p_before_at: cursor?.at ?? undefined,
    p_before_id: cursor?.id ?? undefined,
    p_limit: PAGE_SIZE,
  });
  if (error) throw error;
  return attachPolls(((data ?? []) as FeedRow[]).map(toFeedItem));
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
      const { data, error } = await supabase.rpc("community_feed", { p_post: postId, p_limit: 1 });
      if (error) throw error;
      const row = ((data ?? []) as FeedRow[])[0];
      return row ? (await attachPolls([toFeedItem(row)]))[0] : null;
    },
  });
}

/**
 * El post-hilo de una reseña, donde cuelgan sus respuestas. Si la reseña aún no
 * lo tiene se crea (open_review_thread); si ya lo tiene en la fila, no hay
 * llamada.
 */
export async function openReviewThread(item: Pick<FeedItem, "id" | "reviewId" | "threadPostId">): Promise<string> {
  if (item.threadPostId) return item.threadPostId;
  const { data, error } = await supabase.rpc("open_review_thread", { p_review: item.reviewId ?? item.id });
  if (error) throw error;
  return data as string;
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
  authorUsername: string | null;
  body: string;
  createdAt: string;
  parentReplyId: string | null;
  likeCount: number;
  likedByMe: boolean;
  /** Borrada por su autor con respuestas debajo: se muestra "Respuesta eliminada". */
  removed: boolean;
  pending?: boolean;
};

export const repliesKey = (postId: string) => ["community-replies", postId] as const;

export function usePostReplies(postId: string | undefined, blockedIds?: Set<string>) {
  return useQuery({
    queryKey: repliesKey(postId ?? ""),
    enabled: !!postId,
    queryFn: async (): Promise<Reply[]> => {
      const { data, error } = await supabase
        .from("post_replies")
        .select(
          "id, post_id, author_id, as_restaurant_id, restaurant_id, body, created_at, parent_reply_id, like_count, author_deleted_at, " +
            "author:profiles!post_replies_author_id_fkey(full_name, username, avatar_url), " +
            "as_restaurant:restaurants!post_replies_as_restaurant_id_fkey(name, logo_url), " +
            "restaurant:restaurants!post_replies_restaurant_id_fkey(name)",
        )
        .eq("post_id", postId!)
        .eq("moderation", "visible")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const { data: u } = await getSessionUser();
      const ids = (data ?? []).map((r: any) => r.id as string);
      const liked = new Set<string>();
      if (u.user && ids.length) {
        const { data: likes } = await supabase
          .from("post_reply_likes")
          .select("reply_id")
          .eq("user_id", u.user.id)
          .in("reply_id", ids);
        for (const l of likes ?? []) liked.add(l.reply_id);
      }
      type Row = {
        id: string;
        post_id: string;
        parent_reply_id: string | null;
        like_count: number;
        author_deleted_at: string | null;
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
        authorUsername: r.author?.username ?? null,
        asRestaurantId: r.as_restaurant_id,
        asRestaurantName: r.as_restaurant?.name ?? null,
        asRestaurantLogo: r.as_restaurant?.logo_url ?? null,
        restaurantId: r.restaurant_id,
        restaurantName: r.restaurant?.name ?? null,
        body: r.author_deleted_at ? "" : r.body,
        createdAt: r.created_at,
        parentReplyId: r.parent_reply_id,
        likeCount: r.like_count ?? 0,
        likedByMe: liked.has(r.id),
        removed: !!r.author_deleted_at,
      }));
    },
    select: (rows) => {
      const list = blockedIds?.size ? rows.filter((r) => !blockedIds.has(r.authorId)) : rows;
      // Una respuesta oculta por moderación (o de alguien bloqueado) que tiene
      // respuestas debajo se muestra como "Respuesta eliminada" para no romper el hilo.
      const ids = new Set(list.map((r) => r.id));
      const ghosts = new Map<string, Reply>();
      for (const r of list) {
        if (r.parentReplyId && !ids.has(r.parentReplyId) && !ghosts.has(r.parentReplyId)) {
          ghosts.set(r.parentReplyId, {
            ...r,
            id: r.parentReplyId,
            parentReplyId: null,
            body: "",
            removed: true,
            likeCount: 0,
            likedByMe: false,
            createdAt: new Date(new Date(r.createdAt).getTime() - 1).toISOString(),
          });
        }
      }
      return ghosts.size ? [...list, ...ghosts.values()] : list;
    },
  });
}

// ─── Ajustes globales ───────────────────────────────────────────────────────

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("owner_posts_enabled").maybeSingle();
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
/**
 * Cambia una fila en el feed y en el detalle abierto. `id` puede ser el de un
 * post, el de una reseña o el de su post-hilo: la reseña aparece con su id en el
 * feed y con el del hilo en el detalle, y las dos son la misma.
 */
function patchFeedItem(qc: ReturnType<typeof useQueryClient>, id: string, fn: (it: FeedItem) => FeedItem) {
  const hit = (it: FeedItem) => it.id === id || it.threadPostId === id || it.reviewId === id;
  qc.setQueriesData<FeedPages>({ queryKey: ["community-feed"] }, (old) =>
    old ? { ...old, pages: old.pages.map((page) => page.map((it) => (hit(it) ? fn(it) : it))) } : old,
  );
  qc.setQueriesData<FeedItem | null>({ queryKey: ["community-post"] }, (old) => (old && hit(old) ? fn(old) : old));
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
  poll?: NewPoll | null;
  onPhotoUploaded?: (done: number, total: number) => void;
};

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create-post"],
    mutationFn: async (p: NewPost) => {
      const { data: id, error } = await supabase.rpc("create_post", {
        p_client_id: p.clientId,
        p_topic: p.topic,
        p_body: p.body,
        p_restaurant_id: p.restaurantId ?? undefined,
        p_suggested_name: p.suggestedName ?? undefined,
        p_suggested_zone: p.suggestedZone ?? undefined,
        p_category_ids: p.categoryIds,
        p_as_restaurant_id: p.asRestaurantId ?? undefined,
      });
      if (error) throw error;
      const postId = id as string;

      if (p.photos.length > 0) {
        // En un reintento el post ya existe: solo se suben las fotos que faltan.
        const { data: existing, error: exErr } = await supabase
          .from("post_photos")
          .select("position")
          .eq("post_id", postId);
        if (exErr) throw exErr;
        const have = new Set((existing ?? []).map((r) => r.position));
        const photos = p.photos.slice(0, 4);
        let done = have.size;
        p.onPhotoUploaded?.(done, photos.length);
        const rows = await Promise.all(
          photos
            .map((uri, i) => ({ uri, i }))
            .filter(({ i }) => !have.has(i))
            .map(async ({ uri, i }) => {
              const path = await uploadPostPhoto(postId, i, uri);
              p.onPhotoUploaded?.(++done, photos.length);
              return { post_id: postId, position: i, storage_path: path };
            }),
        );
        if (rows.length > 0) {
          const { error: phErr } = await supabase.from("post_photos").insert(rows);
          if (phErr) throw phErr;
        }
      }

      if (p.poll && p.poll.options.length >= 2) {
        const { error: pollErr } = await supabase.rpc("create_poll", {
          p_post_id: postId,
          p_days: p.poll.days,
          p_options: p.poll.options.map((o) =>
            "label" in o ? { label: o.label.trim() } : { restaurant_id: o.restaurantId },
          ),
        });
        // En un reintento la encuesta ya puede existir.
        if (pollErr && !errorCode(pollErr).includes("poll_exists")) throw pollErr;
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
        reviewId: null,
        threadPostId: null,
        poll: p.poll
          ? {
              closes_at: new Date(Date.now() + p.poll.days * 86400000).toISOString(),
              closed: false,
              total: 0,
              my_option: null,
              options: p.poll.options.map((o, i) => ({
                id: `pending-${i}`,
                label: "label" in o ? o.label : null,
                restaurant: "label" in o ? null : { id: o.restaurantId, name: o.name },
                votes: null,
              })),
            }
          : null,
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
    // Si falla, solo se quita el post pendiente: los me gusta que diste
    // mientras tanto no se pierden.
    onError: (_e, p) => removeFromFeeds(qc, `pending-${p.clientId}`),
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
      parentReplyId,
    }: {
      body: string;
      restaurantId?: string | null;
      restaurantName?: string | null;
      asRestaurantId?: string | null;
      parentReplyId?: string | null;
    }) => {
      const { data: u } = await getSessionUser();
      if (!u.user) throw new Error("not_authenticated");
      const { error } = await supabase.from("post_replies").insert({
        post_id: postId,
        author_id: u.user.id,
        body,
        restaurant_id: asRestaurantId ? null : (restaurantId ?? null),
        as_restaurant_id: asRestaurantId ?? null,
        parent_reply_id: parentReplyId ?? null,
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
        authorUsername: null,
        asRestaurantId: v.asRestaurantId ?? null,
        asRestaurantName: null,
        asRestaurantLogo: null,
        restaurantId: v.restaurantId ?? null,
        restaurantName: v.restaurantName ?? null,
        body: v.body,
        createdAt: new Date().toISOString(),
        parentReplyId: v.parentReplyId ?? null,
        likeCount: 0,
        likedByMe: false,
        removed: false,
        pending: true,
      };
      qc.setQueryData<Reply[]>(repliesKey(postId), [...(prev ?? []), optimistic]);
      patchFeedItem(qc, postId, (it) => ({ ...it, replyCount: it.replyCount + 1 }));
      return { optimisticId: optimistic.id };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData<Reply[]>(repliesKey(postId), (list) => (list ?? []).filter((r) => r.id !== ctx?.optimisticId));
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
    mutationFn: async ({ item, liked }: { item: Pick<FeedItem, "id" | "kind" | "reviewId">; liked: boolean }) => {
      const { data: u } = await getSessionUser();
      if (!u.user) throw new Error("not_authenticated");
      const userId = u.user.id;
      if (item.kind === "review") {
        const reviewId = item.reviewId ?? item.id;
        const q = liked
          ? supabase.from("review_helpful").delete().eq("user_id", userId).eq("review_id", reviewId)
          : supabase.from("review_helpful").insert({ user_id: userId, review_id: reviewId });
        const { error } = await q;
        if (error && error.code !== "23505") throw error;
      } else {
        const q = liked
          ? supabase.from("post_likes").delete().eq("user_id", userId).eq("post_id", item.id)
          : supabase.from("post_likes").insert({ user_id: userId, post_id: item.id });
        const { error } = await q;
        // 23505: el me gusta ya estaba (doble toque rápido); es lo que se quería.
        if (error && error.code !== "23505") throw error;
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
    // No se recarga el feed: el cambio optimista ya es el resultado, y
    // recargar todas las páginas movía la lista y mostraba la ruedita.
    // Si el servidor falla, onError lo revierte.
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
      const { error } = await supabase.from("posts").delete().eq("id", postId);
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
      const { error } = await supabase.rpc("delete_my_reply", { p_reply_id: replyId });
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

/** Votar en una encuesta (o cambiar el voto). Muestra los resultados al instante. */
export function useVotePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, optionId }: { postId: string; optionId: string }) => {
      const { data, error } = await supabase.rpc("vote_poll", { p_post_id: postId, p_option_id: optionId });
      if (error) throw error;
      return data as unknown as PollState;
    },
    onSuccess: (state, { postId }) => patchFeedItem(qc, postId, (it) => ({ ...it, poll: state })),
  });
}

/** Me gusta en una respuesta. Optimista. */
export function useToggleReplyLike(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ replyId, like }: { replyId: string; like: boolean }) => {
      const { data: u } = await getSessionUser();
      if (!u.user) throw new Error("not_authenticated");
      const q = like
        ? supabase.from("post_reply_likes").insert({ reply_id: replyId, user_id: u.user.id })
        : supabase.from("post_reply_likes").delete().eq("reply_id", replyId).eq("user_id", u.user.id);
      const { error } = await q;
      if (error && !(like && (error as any).code === "23505")) throw error;
    },
    onMutate: async ({ replyId, like }) => {
      await qc.cancelQueries({ queryKey: repliesKey(postId) });
      const prev = qc.getQueryData<Reply[]>(repliesKey(postId));
      qc.setQueryData<Reply[]>(repliesKey(postId), (list) =>
        (list ?? []).map((r) =>
          r.id === replyId ? { ...r, likedByMe: like, likeCount: Math.max(0, r.likeCount + (like ? 1 : -1)) } : r,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(repliesKey(postId), ctx?.prev),
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
      const { error } = await supabase.from("post_reports").insert({
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
