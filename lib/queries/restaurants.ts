import { parseHours, type Hours } from "@/lib/hours";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type RestaurantCategory = {
  slug: string;
  label: string;
  icon: string;
};

export type RestaurantAmenity = {
  id: number;
  slug: string;
  label: string;
  icon: string;
};

/** Un local está "destacado" mientras boost_until esté en el futuro. */
export function isBoosted(r: { boost_until?: string | null } | null | undefined): boolean {
  return !!r?.boost_until && new Date(r.boost_until).getTime() > Date.now();
}

/** Los primeros 100 locales aprobados — insignia permanente, gratis siempre. */
export function isFounder(r: { founder_rank?: number | null } | null | undefined): boolean {
  return typeof r?.founder_rank === "number";
}

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
  boost_until: string | null;
  founder_rank: number | null;
  categories: RestaurantCategory[];
  amenities: RestaurantAmenity[];
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
       status, status_reason, rating_avg, rating_count, boost_until, founder_rank,
       restaurant_categories ( categories ( slug, label, icon ) ),
       restaurant_amenities ( amenities ( id, slug, label, icon ) )`,
    )
    .eq("id", id)
    .single();

  if (error) throw error;

  // Cast right away — the generated Supabase types don't know about a
  // brand-new column (founder_rank) until `supabase gen types` is re-run
  // against the pushed migration, and choke on the embedded relations too.
  const row = data as any;

  const categories: RestaurantCategory[] = (row.restaurant_categories ?? [])
    .map((rc: any) => rc.categories)
    .filter(Boolean);
  const amenities: RestaurantAmenity[] = (row.restaurant_amenities ?? [])
    .map((ra: any) => ra.amenities)
    .filter(Boolean);

  const { restaurant_categories, restaurant_amenities, hours, ...rest } = row;
  return {
    ...(rest as Omit<RestaurantDetail, "categories" | "amenities" | "hours">),
    hours: parseHours(hours),
    categories,
    amenities,
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
