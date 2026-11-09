import { test } from "node:test";
import assert from "node:assert/strict";
import { availableCurrencies, convertAmount, initialCurrency, parseMoneyInput, rateAgeDays, rateNote } from "./money.ts";

test("selector_oculta_moneda_sin_tasa", () => {
  assert.deepEqual(availableCurrencies(["usd", "bs", "cop"], "usd", { bs: null, cop: 3200 }), ["usd", "cop"]);
  // La base siempre sale, aunque no haya tasa para convertir.
  assert.deepEqual(availableCurrencies(["bs", "usd"], "bs", { bs: null, cop: null }), ["bs"]);
});

test("arranque_en_dolares", () => {
  assert.equal(initialCurrency(["usd", "bs"], "bs", null), "usd");
  assert.equal(initialCurrency(["bs", "cop"], "bs", "usd"), "bs");
  assert.equal(initialCurrency(["usd", "bs"], "usd", "bs"), "bs");
});

test("nota_tasa", () => {
  assert.equal(rateNote("bs", false, null).text, "Tasa BCV de hoy");
  assert.equal(rateNote("cop", false, null).text, "Tasa del día");
  assert.deepEqual(rateNote("cop", true, 9), { text: "Tasa de hace 9 días, confirma con el local", stale: true });
  assert.equal(rateNote("bs", true, 0).text, "Tasa del local · actualizada hoy");
  assert.equal(rateNote("bs", true, 1).text, "Tasa del local · actualizada ayer");
  assert.equal(rateNote("bs", true, 3).text, "Tasa del local · actualizada hace 3 días");
  assert.equal(rateNote("bs", true, 7).stale, false);
  assert.equal(rateNote("bs", true, null).text, "Tasa del local");
});

test("edad_tasa", () => {
  assert.equal(rateAgeDays("2026-11-01T15:00:00Z", new Date("2026-11-08T15:00:00Z")), 7);
  // 23:30 en Caracas del día 7 vs. 00:30 del día 8 = 1 día calendario.
  assert.equal(rateAgeDays("2026-11-08T03:30:00Z", new Date("2026-11-08T04:30:00Z")), 1);
  assert.equal(rateAgeDays(null, new Date()), null);
});

test("convertir_base_bs", () => {
  assert.equal(convertAmount(5000, "bs", "usd", { bs: 1000, cop: null }), 5);
  assert.equal(convertAmount(5, "usd", "cop", { bs: 1000, cop: null }), null);
});

test("leer_monto_escrito", () => {
  assert.equal(parseMoneyInput("1,50", "usd"), 1.5);
  assert.equal(parseMoneyInput("1.50", "usd"), 1.5);
  assert.equal(parseMoneyInput("1.500", "bs"), 1500);
  assert.equal(parseMoneyInput("1.500", "cop"), 1500);
  assert.equal(parseMoneyInput("1.500.000", "cop"), 1500000);
  assert.equal(parseMoneyInput("1.500,50", "bs"), 1500.5);
  assert.equal(parseMoneyInput("1,500.50", "usd"), 1500.5);
  assert.equal(parseMoneyInput("0", "usd"), null);
  assert.equal(parseMoneyInput("abc", "usd"), null);
  assert.equal(parseMoneyInput("200000000", "bs"), null);
});
