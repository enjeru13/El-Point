import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { availableCurrencies, initialCurrency, type Cur, type Rates } from "@/lib/money";
import type { CartItem, LatLng } from "@/lib/order";

// Un carrito por local, solo en memoria: sobrevive a salir y volver al local,
// se pierde al cerrar la app. No se sube a ningún lado.
type Carts = Record<string, CartItem[]>;

type Updater = (items: CartItem[]) => CartItem[];

const CartContext = createContext<{ carts: Carts; update: (restaurantId: string, fn: Updater) => void } | null>(null);

export function OrderCartProvider({ children }: { children: ReactNode }) {
  const [carts, setCarts] = useState<Carts>({});
  const update = useCallback((restaurantId: string, fn: Updater) => {
    setCarts((prev) => ({ ...prev, [restaurantId]: fn(prev[restaurantId] ?? []).filter((i) => i.qty > 0) }));
  }, []);
  const value = useMemo(() => ({ carts, update }), [carts, update]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function setQty(items: CartItem[], id: string, n: number): CartItem[] {
  if (n <= 0) return items.filter((i) => i.id !== id);
  return items.some((i) => i.id === id) ? items.map((i) => (i.id === id ? { id, qty: n } : i)) : [...items, { id, qty: n }];
}

export function useCart(restaurantId: string) {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fuera de OrderCartProvider");
  const { carts, update } = ctx;
  const items = useMemo(() => carts[restaurantId] ?? [], [carts, restaurantId]);

  const qty = useCallback((id: string) => items.find((i) => i.id === id)?.qty ?? 0, [items]);
  const current = (list: CartItem[], id: string) => list.find((i) => i.id === id)?.qty ?? 0;
  const set = useCallback((id: string, n: number) => update(restaurantId, (list) => setQty(list, id, n)), [restaurantId, update]);
  const add = useCallback(
    (id: string) => update(restaurantId, (list) => setQty(list, id, current(list, id) + 1)),
    [restaurantId, update],
  );
  const remove = useCallback(
    (id: string) => update(restaurantId, (list) => setQty(list, id, current(list, id) - 1)),
    [restaurantId, update],
  );
  const clear = useCallback(() => update(restaurantId, () => []), [restaurantId, update]);

  return { items, qty, add, remove, set, clear };
}

const CURRENCY_KEY = "elpoint.menuCurrency";

/** Última moneda que el comensal eligió en el menú (en este teléfono). */
export function usePreferredCurrency(): [Cur | null, (c: Cur) => void] {
  const [value, setValue] = useState<Cur | null>(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(CURRENCY_KEY)
      .then((v) => {
        if (alive && (v === "usd" || v === "bs" || v === "cop")) setValue(v);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const save = useCallback((c: Cur) => {
    setValue(c);
    AsyncStorage.setItem(CURRENCY_KEY, c).catch(() => {});
  }, []);
  return [value, save];
}

const DELIVERY_KEY = "elpoint.lastDelivery";

export type LastDelivery = LatLng & { references: string };

/** Último punto de entrega y referencias (solo en este teléfono, nunca en Supabase). */
export function useLastDelivery() {
  const [value, setValue] = useState<LastDelivery | null>(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(DELIVERY_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const v = JSON.parse(raw);
        if (Number.isFinite(v?.lat) && Number.isFinite(v?.lng)) {
          setValue({ lat: v.lat, lng: v.lng, references: typeof v.references === "string" ? v.references : "" });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const save = useCallback((v: LastDelivery) => {
    setValue(v);
    AsyncStorage.setItem(DELIVERY_KEY, JSON.stringify(v)).catch(() => {});
  }, []);
  return { value, save };
}

/**
 * Moneda en que el comensal ve el menú de un local: la que eligió la última
 * vez si el local la tiene, si no dólares, si no la base. Al cambiarla se
 * recuerda para todos los locales.
 */
export function useMenuCurrency(settings: { base: Cur; currencies: Cur[] }, rates: Rates) {
  const [preferred, setPreferred] = usePreferredCurrency();
  const available = useMemo(
    () => availableCurrencies(settings.currencies, settings.base, rates),
    [settings.currencies, settings.base, rates],
  );
  const currency = initialCurrency(available, settings.base, preferred);
  return { currency, available, setCurrency: setPreferred };
}
