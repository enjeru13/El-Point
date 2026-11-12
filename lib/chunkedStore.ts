// Guarda valores largos en un almacén que limita el tamaño de cada valor
// (SecureStore avisa o falla por encima de ~2048 bytes). Módulo puro, con el
// almacén inyectado, para probarlo con `node --test`.
//
// Por qué: la sesión de Supabase de una cuenta de Google o Apple trae nombre,
// foto y datos del proveedor y puede pasar ese límite. Si no se guarda, la
// persona aparece desconectada al volver a abrir la app.
//
// Formato: un valor corto se guarda tal cual en `key` (igual que antes, así las
// sesiones ya guardadas siguen sirviendo). Uno largo se parte en `key.0`,
// `key.1`, … y en `key` queda el marcador "__chunks__:N".

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/** Caracteres por parte. Holgado: un carácter puede ocupar más de un byte. */
export const CHUNK_SIZE = 600;
const MARKER = "__chunks__:";

const partKey = (key: string, i: number) => `${key}.${i}`;

function chunkCount(stored: string | null): number {
  if (!stored || !stored.startsWith(MARKER)) return 0;
  const n = Number(stored.slice(MARKER.length));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function createChunkedStore(store: KeyValueStore): KeyValueStore {
  async function removeParts(key: string, from: number, to: number) {
    for (let i = from; i < to; i++) await store.removeItem(partKey(key, i));
  }

  return {
    async getItem(key) {
      const head = await store.getItem(key);
      const n = chunkCount(head);
      if (n === 0) return head;
      const parts: string[] = [];
      for (let i = 0; i < n; i++) {
        const part = await store.getItem(partKey(key, i));
        // Falta una parte: mejor sin sesión que con una sesión rota.
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join("");
    },

    async setItem(key, value) {
      const before = chunkCount(await store.getItem(key));
      if (value.length <= CHUNK_SIZE) {
        await store.setItem(key, value);
        await removeParts(key, 0, before);
        return;
      }
      const n = Math.ceil(value.length / CHUNK_SIZE);
      // Primero las partes y al final el marcador: si algo falla a la mitad,
      // el marcador viejo sigue apuntando a una sesión completa o a ninguna.
      for (let i = 0; i < n; i++) {
        await store.setItem(partKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
      }
      await store.setItem(key, MARKER + n);
      await removeParts(key, n, before);
    },

    async removeItem(key) {
      const n = chunkCount(await store.getItem(key));
      await store.removeItem(key);
      await removeParts(key, 0, n);
    },
  };
}
