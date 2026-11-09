import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Cur } from "@/lib/money";
import type { CartItem, LatLng } from "@/lib/order";

// Un carrito por local, solo en memoria: sobrevive a salir y volver al local,
// se pierde al cerrar la app. No se sube a ningún lado.
type Carts = Record<string, CartItem[]>;

const CartContext = createContext<{ carts: Carts; setCart: (restaurantId: string, items: CartItem[]) => void } | null>(null);

export function OrderCartProvider({ children }: { children: ReactNode }) {
  const [carts, setCarts] = useState<Carts>({});
  const setCart = useCallback((restaurantId: string, items: CartItem[]) => {
    setCarts((prev) => ({ ...prev, [restaurantId]: items.filter((i) => i.qty > 0) }));
  }, []);
  const value = useMemo(() => ({ carts, setCart }), [carts, setCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(restaurantId: string) {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fuera de OrderCartProvider");
  const { carts, setCart } = ctx;
  const items = useMemo(() => carts[restaurantId] ?? [], [carts, restaurantId]);

  const qty = useCallback((id: string) => items.find((i) => i.id === id)?.qty ?? 0, [items]);
  const set = useCallback(
    (id: string, n: number) => {
      const rest = items.filter((i) => i.id !== id);
      const next = n > 0 ? [...items.map((i) => (i.id === id ? { id, qty: n } : i))] : rest;
      if (n > 0 && !items.some((i) => i.id === id)) next.push({ id, qty: n });
      setCart(restaurantId, next);
    },
    [items, restaurantId, setCart],
  );
  const add = useCallback((id: string) => set(id, qty(id) + 1), [set, qty]);
  const remove = useCallback((id: string) => set(id, qty(id) - 1), [set, qty]);
  const clear = useCallback(() => setCart(restaurantId, []), [restaurantId, setCart]);

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
