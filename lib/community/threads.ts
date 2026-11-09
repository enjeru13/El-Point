// Respuestas de un post armadas como hilos de un solo nivel de sangría.
// Módulo puro (sin React Native) para poder probarlo con `node --test`.

export type ThreadReply = { id: string; parentId: string | null; createdAt: string; removed: boolean };

export type Thread<T extends ThreadReply> = {
  root: T;
  /** Respuestas debajo de la raíz, en orden. `replyingTo` = id del padre directo si no es la raíz. */
  children: (T & { replyingTo: string | null })[];
};

/**
 * Cada respuesta cuelga de la raíz de su cadena. Una respuesta cuyo padre ya
 * no está (borrado del todo) pasa a ser raíz. Una raíz eliminada sin
 * respuestas debajo no se muestra.
 */
export function buildThreads<T extends ThreadReply>(replies: T[]): Thread<T>[] {
  const byId = new Map(replies.map((r) => [r.id, r]));
  const rootOf = (r: T): T => {
    let cur = r;
    const seen = new Set<string>();
    while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.parentId)!;
    }
    return cur;
  };
  const sorted = [...replies].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const threads = new Map<string, Thread<T>>();
  for (const r of sorted) {
    const root = rootOf(r);
    if (root.id === r.id) {
      if (!threads.has(r.id)) threads.set(r.id, { root: r, children: [] });
      continue;
    }
    if (!threads.has(root.id)) threads.set(root.id, { root, children: [] });
    threads.get(root.id)!.children.push({ ...r, replyingTo: r.parentId === root.id ? null : r.parentId });
  }
  return [...threads.values()]
    .filter((t) => !(t.root.removed && t.children.length === 0))
    .sort((a, b) => a.root.createdAt.localeCompare(b.root.createdAt));
}
