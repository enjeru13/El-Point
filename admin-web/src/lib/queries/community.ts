import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { ReviewReportReason } from "../reasons";

// ─── Posts y respuestas reportados ───────────────────────────────────────────

export const TOPIC_LABEL: Record<string, string> = {
  recomiendame: "Recomiéndame",
  locales_nuevos: "Locales nuevos",
  recetas: "Recetas",
  antojos: "Antojos",
  novedades: "Novedades",
};

export type CommunityReport = { reason: ReviewReportReason; note: string | null; created_at: string };

export type ReportedItem = {
  kind: "post" | "reply";
  id: string;
  /** Post al que pertenece (el mismo id si es un post). */
  post_id: string;
  topic: string | null;
  body: string;
  /** Para respuestas: el texto del post que responden. */
  parent_body: string | null;
  author_name: string;
  /** Si lo publicó un local, su nombre. */
  as_restaurant_name: string | null;
  place_name: string | null;
  photo_urls: string[];
  moderation: "visible" | "hidden" | "removed";
  created_at: string;
  reports: CommunityReport[];
};

const REPORTED_KEY = ["admin-community-reported"] as const;

function personName(p: any): string {
  return p?.username ? `@${p.username}` : (p?.full_name ?? "Anónimo");
}

function photoUrl(path: string): string {
  return supabase.storage.from("post-photos").getPublicUrl(path).data.publicUrl;
}

function mapReports(list: any[] | null | undefined): CommunityReport[] {
  return ((list ?? []) as any[])
    .map((r) => ({ reason: r.reason as ReviewReportReason, note: r.note ?? null, created_at: r.created_at }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

const POST_COLS = `id, topic, body, moderation, created_at, suggested_name,
  author:profiles!author_id ( username, full_name ),
  as_restaurant:restaurants!as_restaurant_id ( name ),
  restaurant:restaurants!restaurant_id ( name ),
  post_photos ( position, storage_path )`;

const REPLY_COLS = `id, post_id, body, moderation, created_at,
  author:profiles!author_id ( username, full_name ),
  as_restaurant:restaurants!as_restaurant_id ( name ),
  restaurant:restaurants!restaurant_id ( name ),
  post:posts!post_id ( body, topic )`;

/**
 * Cola de moderación: posts y respuestas con reportes, más los que quedaron
 * ocultos (3 reportes) aunque sus reportes ya no estén. Los más reportados
 * primero.
 */
async function fetchReported(): Promise<ReportedItem[]> {
  const [postsRep, postsHidden, repliesRep, repliesHidden] = await Promise.all([
    supabase.from("posts").select(`${POST_COLS}, post_reports!inner ( reason, note, created_at )`).neq("moderation", "removed"),
    supabase.from("posts").select(`${POST_COLS}, post_reports ( reason, note, created_at )`).eq("moderation", "hidden"),
    supabase.from("post_replies").select(`${REPLY_COLS}, post_reports!inner ( reason, note, created_at )`).neq("moderation", "removed"),
    supabase.from("post_replies").select(`${REPLY_COLS}, post_reports ( reason, note, created_at )`).eq("moderation", "hidden"),
  ]);
  for (const r of [postsRep, postsHidden, repliesRep, repliesHidden]) if (r.error) throw r.error;

  const byId = new Map<string, ReportedItem>();

  for (const p of [...(postsRep.data ?? []), ...(postsHidden.data ?? [])] as any[]) {
    byId.set(`post:${p.id}`, {
      kind: "post",
      id: p.id,
      post_id: p.id,
      topic: p.topic,
      body: p.body,
      parent_body: null,
      author_name: personName(p.author),
      as_restaurant_name: p.as_restaurant?.name ?? null,
      place_name: p.restaurant?.name ?? p.suggested_name ?? null,
      photo_urls: ((p.post_photos ?? []) as any[])
        .sort((a, b) => a.position - b.position)
        .map((ph) => photoUrl(ph.storage_path)),
      moderation: p.moderation,
      created_at: p.created_at,
      reports: mapReports(p.post_reports),
    });
  }

  for (const r of [...(repliesRep.data ?? []), ...(repliesHidden.data ?? [])] as any[]) {
    byId.set(`reply:${r.id}`, {
      kind: "reply",
      id: r.id,
      post_id: r.post_id,
      topic: r.post?.topic ?? null,
      body: r.body,
      parent_body: r.post?.body ?? null,
      author_name: personName(r.author),
      as_restaurant_name: r.as_restaurant?.name ?? null,
      place_name: r.restaurant?.name ?? null,
      photo_urls: [],
      moderation: r.moderation,
      created_at: r.created_at,
      reports: mapReports(r.post_reports),
    });
  }

  return [...byId.values()].sort(
    (a, b) =>
      (b.moderation === "hidden" ? 1 : 0) - (a.moderation === "hidden" ? 1 : 0) ||
      b.reports.length - a.reports.length ||
      b.created_at.localeCompare(a.created_at),
  );
}

export function useReportedCommunity() {
  return useQuery({ queryKey: REPORTED_KEY, queryFn: fetchReported });
}

/**
 * "keep" deja visible el post o la respuesta; "remove" lo retira (el servidor
 * aplica el strike al autor o cuenta el retiro del local). En ambos casos se
 * borran sus reportes.
 */
export function useResolveCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, id, action }: { kind: "post" | "reply"; id: string; action: "keep" | "remove" }) => {
      const { error } = await supabase
        .from(kind === "post" ? "posts" : "post_replies")
        .update({ moderation: action === "keep" ? "visible" : "removed" })
        .eq("id", id);
      if (error) throw error;

      const { error: clearErr } = await supabase
        .from("post_reports")
        .delete()
        .eq(kind === "post" ? "post_id" : "reply_id", id);
      if (clearErr) throw clearErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORTED_KEY });
      qc.invalidateQueries({ queryKey: BANNED_KEY });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    },
  });
}

// ─── Locales sugeridos ───────────────────────────────────────────────────────

export type SuggestionStatus = "pendiente" | "contactado" | "alta" | "descartado";

export const SUGGESTION_LABEL: Record<SuggestionStatus, string> = {
  pendiente: "Pendiente",
  contactado: "Contactado",
  alta: "De alta",
  descartado: "Descartado",
};

export type LocalSuggestion = {
  normalized_name: string;
  display_name: string;
  status: SuggestionStatus;
  restaurant_id: string | null;
  restaurant_name: string | null;
  post_count: number;
  last_zone: string | null;
  last_post_at: string | null;
};

const SUGGESTIONS_KEY = ["admin-local-suggestions"] as const;

export function useLocalSuggestions() {
  return useQuery({
    queryKey: SUGGESTIONS_KEY,
    queryFn: async (): Promise<LocalSuggestion[]> => {
      const { data, error } = await supabase.rpc("admin_local_suggestions");
      if (error) throw error;
      return ((data ?? []) as any[]).map((s) => ({
        normalized_name: s.normalized_name,
        display_name: s.display_name ?? s.normalized_name,
        status: s.status,
        restaurant_id: s.restaurant_id ?? null,
        restaurant_name: s.restaurant_name ?? null,
        post_count: Number(s.post_count ?? 0),
        last_zone: s.last_zone ?? null,
        last_post_at: s.last_post_at ?? null,
      }));
    },
  });
}

export function useSetSuggestionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, status, restaurantId }: { name: string; status: SuggestionStatus; restaurantId?: string }) => {
      const { error } = await supabase.rpc("set_local_suggestion_status", {
        p_name: name,
        p_status: status,
        p_restaurant: restaurantId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SUGGESTIONS_KEY }),
  });
}

// ─── Ajustes ─────────────────────────────────────────────────────────────────

const SETTINGS_KEY = ["admin-app-settings"] as const;

export function useAppSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async (): Promise<{ owner_posts_enabled: boolean }> => {
      const { data, error } = await supabase.from("app_settings").select("owner_posts_enabled").maybeSingle();
      if (error) throw error;
      return { owner_posts_enabled: !!data?.owner_posts_enabled };
    },
  });
}

export function useSetOwnerPosts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.from("app_settings").update({ owner_posts_enabled: enabled }).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

export type BannedLocal = {
  restaurant_id: string;
  name: string;
  community_banned_at: string | null;
  community_removals: number;
};

const BANNED_KEY = ["admin-community-banned"] as const;

/** Locales con posts retirados; los que llegaron a 3 perdieron el permiso. */
export function useCommunityBanned() {
  return useQuery({
    queryKey: BANNED_KEY,
    queryFn: async (): Promise<BannedLocal[]> => {
      const { data, error } = await supabase.rpc("admin_community_banned");
      if (error) throw error;
      return ((data ?? []) as any[]).map((b) => ({
        restaurant_id: b.restaurant_id,
        name: b.name,
        community_banned_at: b.community_banned_at ?? null,
        community_removals: Number(b.community_removals ?? 0),
      }));
    },
  });
}

export function useRestoreCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (restaurantId: string) => {
      const { error } = await supabase.rpc("admin_restore_community", { p_restaurant: restaurantId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BANNED_KEY }),
  });
}
