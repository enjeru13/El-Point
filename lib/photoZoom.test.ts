import { test } from "node:test";
import assert from "node:assert/strict";
import { clampPan, nextZoom, shouldDismiss } from "./photoZoom.ts";

test("doble_toque_alterna_entre_1_y_zoom", () => {
  assert.equal(nextZoom(1), 2.5);
  assert.equal(nextZoom(1.02), 2.5);
  assert.equal(nextZoom(2.5), 1);
  assert.equal(nextZoom(4), 1);
});

test("sin_zoom_la_foto_no_se_mueve", () => {
  assert.deepEqual(clampPan(80, -40, 1, 400, 800), { x: 0, y: 0 });
});

test("con_zoom_no_pasa_de_los_bordes", () => {
  // Escala 2 en 400x800: puede correrse hasta 200 y 400 a cada lado.
  assert.deepEqual(clampPan(999, -999, 2, 400, 800), { x: 200, y: -400 });
  assert.deepEqual(clampPan(50, 30, 2, 400, 800), { x: 50, y: 30 });
  assert.deepEqual(clampPan(-999, 999, 3, 400, 800), { x: -400, y: 800 });
});

test("cierra_con_arrastre_largo_o_tiron_rapido", () => {
  assert.equal(shouldDismiss(121, 0), true);
  assert.equal(shouldDismiss(60, 1500), true);
  assert.equal(shouldDismiss(60, 300), false);
  assert.equal(shouldDismiss(-200, -2000), false);
});
