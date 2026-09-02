import { parseHours, type Hours } from "@/lib/hours";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type RestaurantCategory = {
  slug: string;
  label: string;
  icon: string;
};

export type RestaurantDetail = {
  id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  address: string | null;
  whatsapp: string | null;
  instagram: string | null;
  phone: string | null;
  price_level: number | null;
  logo_url: string | null;
  cover_url: string | null;
  menu_pdf_url: string | null;
  promo_text: string | null;
  hours: Hours | null;
  is_active: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
  status_reason: string | null;
  rating_avg: number;
  rating_count: number;
  categories: RestaurantCategory[];
};

export function restaurantKeys(id: string) {
  return ["restaurant", id] as const;
}

async function fetchRestaurant(id: string): Promise<RestaurantDetail> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      `id, owner_id, name, description, address, whatsapp, instagram, phone,
       price_level, logo_url, cover_url, menu_pdf_url, promo_text, hours, is_active,
       status, status_reason, rating_avg, rating_count,
       restaurant_categories ( categories ( slug, label, icon ) )`,
    )
    .eq("id", id)
    .single();

  if (error) throw error;

  const categories: RestaurantCategory[] = (data.restaurant_categories ?? [])
    .map((rc: any) => rc.categories)
    .filter(Boolean);

  const { restaurant_categories, hours, ...rest } = data as any;
  return {
    ...(rest as Omit<RestaurantDetail, "categories" | "hours">),
    hours: parseHours(hours),
    categories,
  };
}

export function useRestaurant(id: string) {
  return useQuery({
    queryKey: restaurantKeys(id),
    queryFn: () => fetchRestaurant(id),
    enabled: !!id,
  });
}

// ─── Reportar un local ──────────────────────────────────────────────────────

export type RestaurantReportReason =
  | "nonexistent"
  | "closed"
  | "fake_info"
  | "duplicate"
  | "other";

export const RESTAURANT_REPORT_REASONS: {
  key: RestaurantReportReason;
  label: string;
}[] = [
  { key: "nonexistent", label: "El local no existe" },
  { key: "closed", label: "Cerró de forma permanente" },
  { key: "fake_info", label: "Datos falsos o engañosos" },
  { key: "duplicate", label: "Está duplicado" },
  { key: "other", label: "Otro motivo" },
];

export function useReportRestaurant(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reason,
      note,
    }: {
      reason: RestaurantReportReason;
      note?: string;
    }) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user)
        throw userErr ?? new Error("No autenticado");
      const { error } = await supabase.from("restaurant_reports").insert({
        restaurant_id: restaurantId,
        reporter_id: userData.user.id,
        reason,
        note: note?.trim() ? note.trim() : null,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Ya reportaste este local.");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: restaurantKeys(restaurantId) });
    },
  });
}
