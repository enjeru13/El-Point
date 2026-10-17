import { parseHours, type Hours } from "@/lib/hours";
import { hasPlan } from "@/lib/plan";
import { activePromo } from "@/lib/promo";
import type { PaymentMethod } from "@/lib/queries/paymentMethods";
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

/** Sin local físico — solo delivery/pickup. No sale como pin en el mapa. */
export function isGhostKitchen(r: { ghost_kitchen?: boolean | null } | null | undefined): boolean {
  return !!r?.ghost_kitchen;
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
  paid_until: string | null;
  /** Perfil completo (Original o plan vigente). Sin plan llegan vacíos contacto, menú, fotos, horario, promo, comodidades y pagos. */
  has_plan: boolean;
  ghost_kitchen: boolean;
  zone_label: string | null;
  accepts_orders: boolean;
  order_greeting: string | null;
  menu_currencies: string[];
  menu_base_currency: string;
  menu_bs_rate: number | null;
  menu_cop_rate: number | null;
  categories: RestaurantCategory[];
  amenities: RestaurantAmenity[];
  payment_methods: PaymentMethod[];
};

export function restaurantKeys(id: string) {
  return ["restaurant", id] as const;
}

async function fetchRestaurant(id: string): Promise<RestaurantDetail> {
  // El contacto (WhatsApp, teléfono, Instagram, menú) no se lee de la tabla:
  // lo entrega el servidor según el plan del local.
  const contactReq = supabase.rpc("get_restaurant_contact", { p_restaurant_id: id }).maybeSingle();
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      `id, owner_id, name, description, address,
       price_level, logo_url, cover_url, promo_text, promo_ends_at, hours, is_active,
       status, status_reason, rating_avg, rating_count, boost_until, founder_rank, paid_until,
       ghost_kitchen, zone_label, accepts_orders, order_greeting, menu_currencies, menu_base_currency, menu_bs_rate, menu_cop_rate,
       restaurant_categories ( categories ( slug, label, icon ) ),
       restaurant_amenities ( amenities ( id, slug, label, icon ) ),
       restaurant_payment_methods ( payment_methods ( id, slug, label, icon ) )`,
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  const contact = (await contactReq).data;

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

  const payment_methods: PaymentMethod[] = (row.restaurant_payment_methods ?? [])
    .map((rp: any) => rp.payment_methods)
    .filter(Boolean);

  const { restaurant_categories, restaurant_amenities, restaurant_payment_methods, hours, ...rest } = row;
  const plan = hasPlan(row);
  return {
    ...(rest as Omit<
      RestaurantDetail,
      "categories" | "amenities" | "payment_methods" | "hours" | "whatsapp" | "instagram" | "phone" | "menu_pdf_url" | "has_plan"
    >),
    whatsapp: contact?.whatsapp ?? null,
    instagram: contact?.instagram ?? null,
    phone: contact?.phone ?? null,
    menu_pdf_url: contact?.menu_pdf_url ?? null,
    has_plan: plan,
    // Sin plan: perfil básico. Estos campos llegan vacíos para todos.
    description: plan ? row.description : null,
    logo_url: plan ? row.logo_url : null,
    cover_url: plan ? row.cover_url : null,
    promo_text: plan ? activePromo(row) : null,
    boost_until: plan ? row.boost_until : null,
    hours: plan ? parseHours(hours) : null,
    categories,
    amenities: plan ? amenities : [],
    payment_methods: plan ? payment_methods : [],
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
