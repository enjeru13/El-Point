import { test } from "node:test";
import assert from "node:assert/strict";
import { CHUNK_SIZE, createChunkedStore, type KeyValueStore } from "./chunkedStore.ts";

/** Almacén en memoria que, como SecureStore, rechaza valores largos. */
function memoryStore(limit = 2048) {
  const m = new Map<string, string>();
  const store: KeyValueStore = {
    async getItem(k) {
      return m.has(k) ? m.get(k)! : null;
    },
    async setItem(k, v) {
      if (new TextEncoder().encode(v).length > limit) throw new Error("demasiado largo");
      m.set(k, v);
    },
    async removeItem(k) {
      m.delete(k);
    },
  };
  return { m, store };
}

const KEY = "sb-abc-auth-token";

test("valor_corto_igual_que_antes", async () => {
  const { m, store } = memoryStore();
  const s = createChunkedStore(store);
  await s.setItem(KEY, '{"a":1}');
  assert.equal(m.get(KEY), '{"a":1}');
  assert.equal(await s.getItem(KEY), '{"a":1}');
});

test("sesion_larga_se_guarda_y_se_lee_entera", async () => {
  const { m, store } = memoryStore();
  const s = createChunkedStore(store);
  const big = JSON.stringify({ user: { name: "José Muñoz Ñañez ".repeat(200) }, token: "x".repeat(3000) });
  assert.ok(big.length > 2048);
  await s.setItem(KEY, big);
  assert.equal(await s.getItem(KEY), big);
  assert.match(m.get(KEY)!, /^__chunks__:\d+$/);
  for (const [k, v] of m) if (k !== KEY) assert.ok(v.length <= CHUNK_SIZE, k);
});

test("sesion_vieja_sin_partes_sigue_sirviendo", async () => {
  const { m, store } = memoryStore();
  m.set(KEY, '{"vieja":true}');
  assert.equal(await createChunkedStore(store).getItem(KEY), '{"vieja":true}');
});

test("al_achicarse_borra_las_partes_sobrantes", async () => {
  const { m, store } = memoryStore();
  const s = createChunkedStore(store);
  await s.setItem(KEY, "y".repeat(CHUNK_SIZE * 5));
  await s.setItem(KEY, "z".repeat(CHUNK_SIZE * 2 + 1));
  assert.equal(await s.getItem(KEY), "z".repeat(CHUNK_SIZE * 2 + 1));
  assert.deepEqual([...m.keys()].sort(), [KEY, `${KEY}.0`, `${KEY}.1`, `${KEY}.2`].sort());
  await s.setItem(KEY, "corto");
  assert.deepEqual([...m.keys()], [KEY]);
});

test("cerrar_sesion_borra_todo", async () => {
  const { m, store } = memoryStore();
  const s = createChunkedStore(store);
  await s.setItem(KEY, "w".repeat(CHUNK_SIZE * 3));
  await s.removeItem(KEY);
  assert.equal(m.size, 0);
  assert.equal(await s.getItem(KEY), null);
});

test("si_falta_una_parte_no_devuelve_una_sesion_rota", async () => {
  const { m, store } = memoryStore();
  const s = createChunkedStore(store);
  await s.setItem(KEY, "q".repeat(CHUNK_SIZE * 3));
  m.delete(`${KEY}.1`);
  assert.equal(await s.getItem(KEY), null);
});
