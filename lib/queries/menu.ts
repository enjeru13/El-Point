import { restaurantKeys } from "@/lib/queries/restaurants";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Monedas en las que un local puede mostrar sus precios. El precio base siempre es USD. */
export type Currency = "usd" | "bs" | "cop";

export const CURRENCY_ORDER: Currency[] = ["usd", "bs", "cop"];

export const CURRENCY_LABEL: Record<Currency, string> = {
  usd: "Dólares",
  bs: "Bolívares",
  cop: "Pesos colombianos",
};

export const DEFAULT_SECTIONS = ["Entradas", "Platos fuertes", "Bebidas", "Postres"];

export const MENU_LIMIT = 100;

export type MenuItem = {
  id: string;
  restaurant_id: string;
  section: string;
  name: string;
  description: string | null;
  price_usd: number;
  available: boolean;
  is_daily_special: boolean;
  special_keep: boolean;
  special_date: string | null;
  position: number;
};

export type MenuItemInput = {
  section: string;
  name: string;
  description: string | null;
  price_usd: number;
  available: boolean;
  is_daily_special: boolean;
  special_keep: boolean;
};

/** Fecha de hoy en Caracas (YYYY-MM-DD): el plato del día vence a medianoche de esa hora. */
export function caracasToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
}

/** ¿El plato del día sigue vigente? (marcado, y "mantener" o marcado hoy.) */
export function isSpecialActive(i: Pick<MenuItem, "is_daily_special" | "special_keep" | "special_date">): boolean {
  return i.is_daily_special && (i.special_keep || i.special_date === caracasToday());
}

export function menuKey(restaurantId: string) {
  return ["menu", restaurantId] as const;
}

async function fetchMenu(restaurantId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, restaurant_id, section, name, description, price_usd, available, is_daily_special, special_keep, special_date, position")
    .eq("restaurant_id", restaurantId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, price_usd: Number(r.price_usd) })) as MenuItem[];
}

export function useMenu(restaurantId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: menuKey(restaurantId ?? ""),
    queryFn: () => fetchMenu(restaurantId!),
    enabled: !!restaurantId && enabled,
    staleTime: 60_000,
  });
}

/** Mensaje legible para los errores del servidor (tope de platos, plan vencido…). */
function menuError(e: any): Error {
  const msg: string = e?.message ?? "";
  if (msg.includes("menu_limit")) return new Error(`Llegaste al máximo de ${MENU_LIMIT} platos.`);
  if (e?.code === "42501" || msg.includes("row-level security")) {
    return new Error("Tu plan no está activo: no se pueden guardar cambios en el menú.");
  }
  return e instanceof Error ? e : new Error("No se pudo guardar el plato.");
}

export function useMenuMutations(restaurantId: string | undefined) {
  const qc = useQueryClient();
  const refresh = () => {
    if (!restaurantId) return;
    qc.invalidateQueries({ queryKey: menuKey(restaurantId) });
    qc.invalidateQueries({ queryKey: restaurantKeys(restaurantId) });
  };

  const add = useMutation({
    mutationFn: async ({ input, position }: { input: MenuItemInput; position: number }) => {
      if (!restaurantId) throw new Error("Sin local");
      const { error } = await supabase.from("menu_items").insert({ ...input, restaurant_id: restaurantId, position });
      if (error) throw menuError(error);
    },
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<MenuItemInput> & { position?: number } }) => {
      const { error } = await supabase.from("menu_items").update(patch).eq("id", id);
      if (error) throw menuError(error);
    },
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw menuError(error);
    },
    onSuccess: refresh,
  });

  /** Intercambia el orden de dos platos. */
  const swap = useMutation({
    mutationFn: async ({ a, b }: { a: MenuItem; b: MenuItem }) => {
      // Si empatan en posición, se separan para que el intercambio tenga efecto.
      const pa = a.position === b.position ? b.position + 1 : b.position;
      const r1 = await supabase.from("menu_items").update({ position: pa }).eq("id", a.id);
      if (r1.error) throw menuError(r1.error);
      const r2 = await supabase.from("menu_items").update({ position: a.position }).eq("id", b.id);
      if (r2.error) throw menuError(r2.error);
    },
    onSuccess: refresh,
  });

  return { add, update, remove, swap };
}

/** Monedas guardadas del local, ordenadas y sin valores raros. */
export function normalizeCurrencies(raw: string[] | null | undefined): Currency[] {
  const set = new Set((raw ?? []).filter((c): c is Currency => c === "usd" || c === "bs" || c === "cop"));
  const out = CURRENCY_ORDER.filter((c) => set.has(c));
  return out.length ? out : ["usd"];
}
