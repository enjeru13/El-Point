import { parseHours, type Hours } from "@/lib/hours";
import type { PaymentMethod } from "@/lib/queries/paymentMethods";
import type { RestaurantAmenity, RestaurantCategory } from "@/lib/queries/restaurants";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type OwnerRestaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  price_level: number | null;
  logo_url: string | null;
  cover_url: string | null;
  menu_pdf_url: string | null;
  promo_text: string | null;
  hours: Hours | null;
  is_active: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
  status_reason: string | null;
  submitted_at: string;
  verification_photo_path: string | null;
  rif: string | null;
  rating_avg: number;
  rating_count: number;
  boost_until: string | null;
  founder_rank: number | null;
  paid_until: string | null;
  plan_period_start: string | null;
  plan_kind: string | null;
  host_streak_weeks: number;
  created_at: string;
  ghost_kitchen: boolean;
  zone_label: string | null;
  accepts_orders: boolean;
  order_greeting: string | null;
  menu_currencies: string[];
  menu_base_currency: string;
  menu_bs_rate: number | null;
  menu_cop_rate: number | null;
  lat: number | null;
  lng: number | null;
  categories: RestaurantCategory[];
  amenities: RestaurantAmenity[];
  payment_methods: PaymentMethod[];
};

export const ownerRestaurantKey = ["owner-restaurant"] as const;

async function fetchMyRestaurant(): Promise<OwnerRestaurant | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from("restaurants")
    .select(
      `id, name, description, address, price_level,
       logo_url, cover_url, promo_text, hours, is_active,
       status, status_reason, submitted_at,
       rating_avg, rating_count, boost_until, founder_rank, paid_until, plan_period_start, plan_kind, host_streak_weeks, created_at,
       ghost_kitchen, zone_label, accepts_orders, order_greeting, menu_currencies, menu_base_currency, menu_bs_rate, menu_cop_rate, latitude, longitude,
       restaurant_categories ( categories ( slug, label, icon ) ),
       restaurant_amenities ( amenities ( id, slug, label, icon ) ),
       restaurant_payment_methods ( payment_methods ( id, slug, label, icon ) )`,
    )
    .eq("owner_id", uid)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { restaurant_categories, restaurant_amenities, restaurant_payment_methods, hours, latitude, longitude, ...rest } = data as any;

  // RIF y foto de verificación no son legibles con select directo (privados):
  // el dueño los lee de sus propios locales por esta función.
  const { data: priv } = await supabase.rpc("get_my_restaurant_private");
  const mine = ((priv ?? []) as any[]).find((p) => p.restaurant_id === rest.id);

  return {
    ...(rest as Omit<OwnerRestaurant, "categories" | "amenities" | "payment_methods" | "hours" | "lat" | "lng" | "rif" | "verification_photo_path" | "phone" | "whatsapp" | "instagram" | "menu_pdf_url">),
    // El contacto tampoco se lee con select directo: viene de la misma función.
    phone: (mine?.phone ?? null) as string | null,
    whatsapp: (mine?.whatsapp ?? null) as string | null,
    instagram: (mine?.instagram ?? null) as string | null,
    menu_pdf_url: (mine?.menu_pdf_url ?? null) as string | null,
    rif: (mine?.rif ?? null) as string | null,
    verification_photo_path: (mine?.verification_photo_path ?? null) as string | null,
    hours: parseHours(hours),
    lat: typeof latitude === "number" ? latitude : null,
    lng: typeof longitude === "number" ? longitude : null,
    categories: (restaurant_categories ?? [])
      .map((rc: any) => rc.categories)
      .filter(Boolean),
    amenities: (restaurant_amenities ?? [])
      .map((ra: any) => ra.amenities)
      .filter(Boolean),
    payment_methods: (restaurant_payment_methods ?? [])
      .map((rp: any) => rp.payment_methods)
      .filter(Boolean),
  };
}

export function useMyRestaurant() {
  return useQuery({ queryKey: ownerRestaurantKey, queryFn: fetchMyRestaurant });
}

/** Owner resubmits a rejected listing after fixing it. */
export function useResubmitRestaurant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (restaurantId: string) => {
      const { error } = await supabase.rpc("resubmit_restaurant", {
        p_restaurant_id: restaurantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerRestaurantKey });
    },
  });
}

export type OwnerRestaurantPatch = Partial<{
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  price_level: number | null;
  promo_text: string | null;
  is_active: boolean;
  logo_url: string | null;
  cover_url: string | null;
  menu_pdf_url: string | null;
  hours: Hours;
  rif: string | null;
  verification_photo_path: string | null;
  ghost_kitchen: boolean;
  zone_label: string | null;
  accepts_orders: boolean;
  order_greeting: string | null;
  menu_currencies: string[];
  menu_base_currency: string;
  menu_bs_rate: number | null;
  menu_cop_rate: number | null;
}>;

export function useUpdateMyRestaurant(restaurantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: OwnerRestaurantPatch) => {
      if (!restaurantId) throw new Error("Sin restaurante");
      const { error } = await supabase
        .from("restaurants")
        .update(patch)
        .eq("id", restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerRestaurantKey });
    },
  });
}

/** Pin opcional para cocinas fantasma que registraron solo zona en texto --
 *  `null` lo quita. RPC en vez de un plain update porque `location` es
 *  geography, necesita construirse con PostGIS. */
export function useSetRestaurantZoneLocation(restaurantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (coords: { lat: number; lng: number } | null) => {
      if (!restaurantId) throw new Error("Sin restaurante");
      const { error } = await supabase.rpc("set_restaurant_zone_location", {
        p_restaurant_id: restaurantId,
        // null quita el pin (la función lo acepta; los tipos generados no lo saben)
        p_lat: (coords?.lat ?? null) as number,
        p_lng: (coords?.lng ?? null) as number,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerRestaurantKey });
    },
  });
}

/** Replaces the restaurant's full amenity set atomically (server-side RPC). */
export function useUpdateRestaurantAmenities(restaurantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amenityIds: number[]) => {
      if (!restaurantId) throw new Error("Sin restaurante");
      const { error } = await supabase.rpc("set_restaurant_amenities", {
        p_restaurant_id: restaurantId,
        p_amenity_ids: amenityIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerRestaurantKey });
    },
  });
}

/** Reemplaza el conjunto completo de métodos de pago (RPC atómico). */
export function useUpdateRestaurantPaymentMethods(restaurantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (methodIds: number[]) => {
      if (!restaurantId) throw new Error("Sin restaurante");
      const { error } = await supabase.rpc("set_restaurant_payment_methods", {
        p_restaurant_id: restaurantId,
        p_method_ids: methodIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ownerRestaurantKey });
    },
  });
}
