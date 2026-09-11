import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { RestaurantReportReason } from "../reasons";

async function verificationPhotoUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("restaurant-verification")
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

// ─── Verification queue ─────────────────────────────────────────────────────

export type PendingRestaurant = {
  id: string;
  name: string;
  address: string | null;
  whatsapp: string | null;
  instagram: string | null;
  rif: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  status_reason: string | null;
  submitted_at: string;
  owner_name: string;
  categories: string[];
  photo_url: string | null;
};

const QUEUE_KEY = ["admin-restaurant-queue"] as const;
const REPORTS_KEY = ["admin-restaurant-reports"] as const;

async function fetchPendingRestaurants(): Promise<PendingRestaurant[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      `id, name, address, whatsapp, instagram, rif, status, status_reason,
       submitted_at, verification_photo_path,
       owner:profiles!owner_id ( username, full_name ),
       restaurant_categories ( categories ( label ) )`,
    )
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });

  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (r: any) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      whatsapp: r.whatsapp,
      instagram: r.instagram,
      rif: r.rif,
      status: r.status,
      status_reason: r.status_reason,
      submitted_at: r.submitted_at,
      owner_name: r.owner?.username ? `@${r.owner.username}` : (r.owner?.full_name ?? "Dueño"),
      categories: ((r.restaurant_categories ?? []) as any[])
        .map((rc) => rc.categories?.label)
        .filter(Boolean),
      photo_url: r.verification_photo_path
        ? await verificationPhotoUrl(r.verification_photo_path)
        : null,
    })),
  );
}

export function useRestaurantQueue() {
  return useQuery({ queryKey: QUEUE_KEY, queryFn: fetchPendingRestaurants });
}

export function useReviewRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      action,
      reason,
    }: {
      restaurantId: string;
      action: "approve" | "reject";
      reason?: string;
    }) => {
      const { error } = await supabase
        .from("restaurants")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          status_reason: action === "reject" ? (reason ?? null) : null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUEUE_KEY });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    },
  });
}

// ─── Reported / suspended restaurants ───────────────────────────────────────

export type ReportedRestaurant = {
  id: string;
  name: string;
  address: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  status_reason: string | null;
  owner_name: string;
  reports: { reason: RestaurantReportReason; note: string | null; created_at: string }[];
};

async function fetchReportedRestaurants(): Promise<ReportedRestaurant[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      `id, name, address, status, status_reason,
       owner:profiles!owner_id ( username, full_name ),
       restaurant_reports ( reason, note, created_at )`,
    )
    .eq("status", "suspended")
    .order("reviewed_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    status: r.status,
    status_reason: r.status_reason,
    owner_name: r.owner?.username ? `@${r.owner.username}` : (r.owner?.full_name ?? "Dueño"),
    reports: ((r.restaurant_reports ?? []) as any[])
      .map((rep) => ({
        reason: rep.reason as RestaurantReportReason,
        note: rep.note ?? null,
        created_at: rep.created_at,
      }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
}

export function useReportedRestaurants() {
  return useQuery({ queryKey: REPORTS_KEY, queryFn: fetchReportedRestaurants });
}

/** 'restore' puts it back to approved, 'remove' rejects it for good. */
export function useResolveRestaurantReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      action,
    }: {
      restaurantId: string;
      action: "restore" | "remove";
    }) => {
      const { error } = await supabase
        .from("restaurants")
        .update({
          status: action === "restore" ? "approved" : "rejected",
          status_reason: action === "restore" ? null : "Retirado tras revisión de reportes",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPORTS_KEY });
      qc.invalidateQueries({ queryKey: ["admin-counts"] });
    },
  });
}

// ─── Hub counters ───────────────────────────────────────────────────────────

export type AdminCounts = {
  reviews: number;
  restaurants: number;
  reported: number;
  support: number;
  payments: number;
};

export function useAdminCounts() {
  return useQuery({
    queryKey: ["admin-counts"],
    queryFn: async (): Promise<AdminCounts> => {
      const [reportedReviewIds, restaurants, reported, support, payments] = await Promise.all([
        supabase.from("review_reports").select("review_id"),
        supabase.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("restaurants").select("id", { count: "exact", head: true }).eq("status", "suspended"),
        supabase.from("support_messages").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("restaurant_payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const distinctReviews = new Set((reportedReviewIds.data ?? []).map((r: any) => r.review_id));
      return {
        reviews: distinctReviews.size,
        restaurants: restaurants.count ?? 0,
        reported: reported.count ?? 0,
        support: support.count ?? 0,
        payments: payments.count ?? 0,
      };
    },
    refetchInterval: 60_000,
  });
}
