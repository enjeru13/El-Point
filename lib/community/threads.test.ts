import { test } from "node:test";
import assert from "node:assert/strict";
import { buildThreads } from "./threads.ts";

const r = (id: string, parentId: string | null, t: number, removed = false) => ({
  id,
  parentId,
  createdAt: new Date(2026, 10, 9, 10, t).toISOString(),
  removed,
});

test("arbol_basico", () => {
  const out = buildThreads([r("c2", "c1", 4), r("r2", null, 2), r("c1", "r1", 3), r("r1", null, 1)]);
  assert.deepEqual(out.map((t) => t.root.id), ["r1", "r2"]);
  assert.deepEqual(out[0].children.map((c) => c.id), ["c1", "c2"]);
  assert.equal(out[0].children[0].replyingTo, null);
  assert.equal(out[0].children[1].replyingTo, "c1");
  assert.deepEqual(out[1].children, []);
});

test("arbol_con_padre_borrado", () => {
  const out = buildThreads([r("r1", null, 1), r("c1", "x", 2)]);
  assert.deepEqual(out.map((t) => t.root.id), ["r1", "c1"]);
});

test("hijo_eliminado_sin_respuestas", () => {
  const out = buildThreads([r("r1", null, 1), r("c1", "r1", 2, true), r("c2", "r1", 3), r("c3", "c2", 4)]);
  assert.deepEqual(out[0].children.map((c) => c.id), ["c2", "c3"]);
});

test("raiz_eliminada_sin_hijos", () => {
  const out = buildThreads([r("r1", null, 1, true), r("r2", null, 2, true), r("c1", "r2", 3)]);
  assert.deepEqual(out.map((t) => t.root.id), ["r2"]);
});
