// Menciones con @ en Comunidad. Misma regla que el servidor
// (extract_mentions): 3 a 30 letras, números, _ o punto, y antes del @ no
// puede haber letra, número, _, punto ni otro @ (así un correo no cuenta).
// Módulo puro (sin React Native) para poder probarlo con `node --test`.

const MENTION = /(^|[^A-Za-z0-9_.@])@([A-Za-z0-9_.]{3,30})/g;

export type MentionSegment = { text: string; username: string | null };

export function mentionSegments(body: string): MentionSegment[] {
  const out: MentionSegment[] = [];
  let last = 0;
  for (const m of body.matchAll(MENTION)) {
    const start = (m.index ?? 0) + m[1].length;
    if (start > last) out.push({ text: body.slice(last, start), username: null });
    out.push({ text: "@" + m[2], username: m[2] });
    last = start + 1 + m[2].length;
  }
  if (last < body.length) out.push({ text: body.slice(last), username: null });
  return out.length ? out : [{ text: body, username: null }];
}

/** Lo que se está escribiendo después de un @ justo antes del cursor, o null. */
export function activeMentionQuery(text: string, caret: number): string | null {
  const before = text.slice(0, caret);
  const m = before.match(/(^|[^A-Za-z0-9_.@])@([A-Za-z0-9_.]{0,30})$/);
  return m ? m[2] : null;
}

/** Posición del cursor después de escribir: fin de lo que cambió entre `prev` y `next`. */
export function caretAfterEdit(prev: string, next: string): number {
  let i = 0;
  while (i < prev.length && i < next.length && prev[i] === next[i]) i++;
  return i + Math.max(0, next.length - prev.length);
}

/** Cambia la @consulta antes del cursor por "@usuario " y devuelve el texto y el cursor nuevos. */
export function insertMention(text: string, caret: number, username: string): { text: string; caret: number } {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return { text, caret };
  const insert = "@" + username + " ";
  const next = text.slice(0, at) + insert + text.slice(caret);
  return { text: next, caret: at + insert.length };
}
