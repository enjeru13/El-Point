// Pedido armado desde el menú y el mensaje que se manda por WhatsApp.
// Módulo puro (sin React Native) para poder probarlo con `node --test`.

import { convertAmount, formatMoney, type Cur, type Rates } from "./money.ts";

/** Lo que guarda el carrito: solo qué y cuánto. El precio sale siempre del menú. */
export type CartItem = { id: string; qty: number };

export type MenuLine = {
  id: string;
  name: string;
  /** En la moneda base del menú. */
  price: number;
  available: boolean;
  /** Plato del día que ya pasó. */
  specialExpired: boolean;
};

/** Costo del delivery. null o "zone" = según la zona, el local confirma. */
export type Delivery = { mode: "fixed" | "zone"; fee: number | null };

export type Fulfillment = "pickup" | "delivery" | null;

export type LatLng = { lat: number; lng: number };

/** Qué puede elegir el comensal según las comodidades del local. */
export function fulfillmentOptions(hasDelivery: boolean, hasTakeaway: boolean): Exclude<Fulfillment, null>[] {
  const out: Exclude<Fulfillment, null>[] = [];
  if (hasTakeaway) out.push("pickup");
  if (hasDelivery) out.push("delivery");
  return out;
}

export function isAddable(line: MenuLine): boolean {
  return line.available && !line.specialExpired;
}

/** Quita del carrito lo que ya no existe, se agotó o quedó en cero. */
export function pruneCart(cart: CartItem[], menu: MenuLine[]): CartItem[] {
  const byId = new Map(menu.map((m) => [m.id, m]));
  return cart.filter((c) => {
    const m = byId.get(c.id);
    return c.qty > 0 && !!m && isAddable(m);
  });
}

function fixedFee(delivery: Delivery | null, fulfillment: Fulfillment): number {
  return fulfillment === "delivery" && delivery?.mode === "fixed" && delivery.fee ? delivery.fee : 0;
}

/** Total en la moneda base, con el delivery fijo si aplica. */
export function cartTotal(cart: CartItem[], menu: MenuLine[], delivery: Delivery | null, fulfillment: Fulfillment): number {
  const byId = new Map(menu.map((m) => [m.id, m]));
  let sum = 0;
  for (const c of pruneCart(cart, menu)) sum += byId.get(c.id)!.price * c.qty;
  return sum + fixedFee(delivery, fulfillment);
}

export function cartCount(cart: CartItem[]): number {
  return cart.reduce((n, c) => n + c.qty, 0);
}

export function canSend(opts: {
  cartCount: number;
  options: Fulfillment[];
  chosen: Fulfillment;
  location: LatLng | null;
}): boolean {
  if (opts.cartCount <= 0) return false;
  const chosen = opts.options.length === 1 ? opts.options[0] : opts.chosen;
  if (opts.options.length > 0 && !chosen) return false;
  if (chosen === "delivery" && !opts.location) return false;
  return true;
}

/** "(≈ Bs 13.000,00 · COP 41.600)" con las monedas que tienen tasa; "" si ninguna. */
export function equivalences(amount: number, base: Cur, shown: Cur[], rates: Rates): string {
  const parts: string[] = [];
  for (const c of shown) {
    if (c === base) continue;
    const v = convertAmount(amount, base, c, rates);
    if (v != null) parts.push(formatMoney(v, c));
  }
  return parts.length ? `(≈ ${parts.join(" · ")})` : "";
}

export function mapsLink(p: LatLng): string {
  return `https://maps.google.com/?q=${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
}

export function buildOrderMessage(input: {
  restaurantName: string;
  greeting: string | null;
  base: Cur;
  shown: Cur[];
  rates: Rates;
  cart: CartItem[];
  menu: MenuLine[];
  delivery: Delivery | null;
  fulfillment: Fulfillment;
  location: LatLng | null;
  references: string;
  note: string;
}): string {
  const { base } = input;
  const money = (v: number) => formatMoney(v, base, true);
  const byId = new Map(input.menu.map((m) => [m.id, m]));
  const cart = pruneCart(input.cart, input.menu);

  const blocks: string[][] = [];
  blocks.push([input.greeting?.trim() || `Hola, quiero hacer un pedido en ${input.restaurantName}.`]);

  blocks.push(
    cart.map((c) => {
      const m = byId.get(c.id)!;
      return `${c.qty} × ${m.name} — ${money(m.price * c.qty)}`;
    }),
  );

  const totals: string[] = [];
  if (input.fulfillment === "delivery") {
    const fee = fixedFee(input.delivery, input.fulfillment);
    totals.push(`Delivery: ${fee ? money(fee) : "según la zona"}`);
  }
  const total = cartTotal(input.cart, input.menu, input.delivery, input.fulfillment);
  const eq = equivalences(total, base, input.shown, input.rates);
  totals.push(`Total: ${money(total)}${eq ? " " + eq : ""}`);
  blocks.push(totals);

  const details: string[] = [];
  if (input.fulfillment) details.push(`Entrega: ${input.fulfillment === "delivery" ? "Delivery" : "Paso a buscarlo"}`);
  if (input.fulfillment === "delivery" && input.location) details.push(`Ubicación: ${mapsLink(input.location)}`);
  if (input.fulfillment === "delivery" && input.references.trim()) details.push(`Referencias: ${input.references.trim()}`);
  if (input.note.trim()) details.push(`Nota: ${input.note.trim()}`);
  if (details.length) blocks.push(details);

  blocks.push(["Pedido desde El Point"]);
  return blocks.map((b) => b.join("\n")).join("\n\n");
}
