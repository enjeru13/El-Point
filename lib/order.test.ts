import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOrderMessage, canSend, cartTotal, fulfillmentOptions, pruneCart, type MenuLine } from "./order.ts";

const line = (id: string, name: string, price: number, extra: Partial<MenuLine> = {}): MenuLine => ({
  id,
  name,
  price,
  available: true,
  specialExpired: false,
  ...extra,
});

test("opciones_de_entrega", () => {
  assert.deepEqual(fulfillmentOptions(true, true), ["pickup", "delivery"]);
  assert.deepEqual(fulfillmentOptions(true, false), ["delivery"]);
  assert.deepEqual(fulfillmentOptions(false, true), ["pickup"]);
  assert.deepEqual(fulfillmentOptions(false, false), []);
});

test("podar_agotados_y_borrados", () => {
  const menu = [line("a", "A", 1), line("b", "B", 1, { available: false }), line("c", "C", 1, { specialExpired: true })];
  const cart = [
    { id: "a", qty: 2 },
    { id: "b", qty: 1 },
    { id: "c", qty: 1 },
    { id: "x", qty: 1 },
    { id: "a0", qty: 0 },
  ];
  assert.deepEqual(pruneCart(cart, [...menu, line("a0", "A0", 1)]), [{ id: "a", qty: 2 }]);
});

test("total_con_delivery_fijo", () => {
  const menu = [line("a", "A", 5000)];
  const cart = [{ id: "a", qty: 2 }];
  assert.equal(cartTotal(cart, menu, { mode: "fixed", fee: 1500 }, "delivery"), 11500);
  assert.equal(cartTotal(cart, menu, { mode: "fixed", fee: 1500 }, "pickup"), 10000);
  assert.equal(cartTotal(cart, menu, { mode: "zone", fee: null }, "delivery"), 10000);
});

test("puede_enviar_requiere_eleccion", () => {
  const both = ["pickup", "delivery"] as const;
  assert.equal(canSend({ cartCount: 1, options: [...both], chosen: null, location: null }), false);
  assert.equal(canSend({ cartCount: 1, options: [...both], chosen: "pickup", location: null }), true);
  assert.equal(canSend({ cartCount: 1, options: [...both], chosen: "delivery", location: null }), false);
  assert.equal(canSend({ cartCount: 1, options: [...both], chosen: "delivery", location: { lat: 1, lng: 1 } }), true);
  assert.equal(canSend({ cartCount: 1, options: [], chosen: null, location: null }), true);
  assert.equal(canSend({ cartCount: 0, options: [], chosen: null, location: null }), false);
});

test("mensaje_completo", () => {
  const msg = buildOrderMessage({
    restaurantName: "Demo",
    greeting: null,
    base: "usd",
    shown: ["usd", "bs", "cop"],
    rates: { bs: 1000, cop: 3200 },
    cart: [
      { id: "h", qty: 2 },
      { id: "p", qty: 1 },
    ],
    menu: [line("h", "Hamburguesa mixta", 5), line("p", "Polar", 1.5)],
    delivery: { mode: "fixed", fee: 1.5 },
    fulfillment: "delivery",
    location: { lat: 7.7712, lng: -72.2201 },
    references: "casa azul, piso 2",
    note: "sin cebolla",
  });
  assert.equal(
    msg,
    [
      "Hola, quiero hacer un pedido en Demo.",
      "",
      "2 × Hamburguesa mixta — $10,00",
      "1 × Polar — $1,50",
      "",
      "Delivery: $1,50",
      "Total: $13,00 (≈ Bs 13.000,00 · COP 41.600)",
      "",
      "Entrega: Delivery",
      "Ubicación: https://maps.google.com/?q=7.77120,-72.22010",
      "Referencias: casa azul, piso 2",
      "Nota: sin cebolla",
      "",
      "Pedido desde El Point",
    ].join("\n"),
  );
});

test("mensaje_base_bs", () => {
  const msg = buildOrderMessage({
    restaurantName: "Demo",
    greeting: "¡Hola! Quiero pedir:",
    base: "bs",
    shown: ["bs", "usd"],
    rates: { bs: 1000, cop: null },
    cart: [{ id: "a", qty: 1 }],
    menu: [line("a", "Arepa", 5000)],
    delivery: null,
    fulfillment: "pickup",
    location: null,
    references: "",
    note: "  ",
  });
  assert.ok(msg.startsWith("¡Hola! Quiero pedir:\n\n"));
  assert.ok(msg.includes("Total: Bs 5.000,00 (≈ $5,00)"));
  assert.ok(msg.includes("Entrega: Paso a buscarlo"));
  assert.ok(!msg.includes("Ubicación"));
  assert.ok(!msg.includes("Nota:"));
});

test("mensaje_sin_tasa_cop", () => {
  const msg = buildOrderMessage({
    restaurantName: "Demo",
    greeting: null,
    base: "usd",
    shown: ["usd", "cop"],
    rates: { bs: null, cop: null },
    cart: [{ id: "a", qty: 1 }],
    menu: [line("a", "Arepa", 5)],
    delivery: null,
    fulfillment: null,
    location: null,
    references: "",
    note: "",
  });
  assert.ok(msg.includes("Total: $5,00\n"));
  assert.ok(!msg.includes("NaN"));
  assert.ok(!msg.includes("("));
});

test("mensaje_zona_sin_entrega", () => {
  const msg = buildOrderMessage({
    restaurantName: "Demo",
    greeting: null,
    base: "usd",
    shown: ["usd"],
    rates: { bs: null, cop: null },
    cart: [{ id: "a", qty: 1 }],
    menu: [line("a", "Arepa", 5)],
    delivery: { mode: "zone", fee: null },
    fulfillment: null,
    location: null,
    references: "",
    note: "",
  });
  assert.ok(!msg.includes("Entrega:"));
  assert.ok(!msg.includes("Delivery:"));
});

test("mensaje_delivery_zona", () => {
  const msg = buildOrderMessage({
    restaurantName: "Demo",
    greeting: null,
    base: "usd",
    shown: ["usd"],
    rates: { bs: null, cop: null },
    cart: [{ id: "a", qty: 1 }],
    menu: [line("a", "Arepa", 5)],
    delivery: null,
    fulfillment: "delivery",
    location: { lat: 1, lng: 2 },
    references: "",
    note: "",
  });
  assert.ok(msg.includes("Delivery: según la zona\nTotal: $5,00"));
});
