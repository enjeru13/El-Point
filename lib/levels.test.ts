import { test } from "node:test";
import assert from "node:assert/strict";
import { levelForXp, xpForLevel } from "./levels.ts";

test("xp_por_nivel_tabla_del_spec", () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(4), 260);
  assert.equal(xpForLevel(9), 1131);
  assert.equal(xpForLevel(16), 2905);
  assert.equal(xpForLevel(25), 5879);
  assert.equal(xpForLevel(35), 9913);
});

test("nivel_por_xp_en_los_bordes", () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(-5), 1);
  assert.equal(levelForXp(259), 3);
  assert.equal(levelForXp(260), 4);
  assert.equal(levelForXp(9912), 34);
  assert.equal(levelForXp(9913), 35);
});

test("nivel_y_xp_son_inversos_hasta_60", () => {
  for (let l = 1; l <= 60; l++) assert.equal(levelForXp(xpForLevel(l)), l);
});
