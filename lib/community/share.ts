// Texto y enlace para compartir una publicación fuera de la app.
// Módulo puro (sin React Native) para poder probarlo con `node --test`.

export const POST_WEB_BASE = "https://elpoint-app.netlify.app/p?id=";

export function sharePostText(p: { id: string; body: string; author: string | null }): string {
  const clean = p.body.replace(/\s+/g, " ").trim();
  const snippet = clean.length > 120 ? clean.slice(0, 119).trimEnd() + "…" : clean;
  const who = p.author ? ` — ${p.author} en Comunidad de El Point` : " — en Comunidad de El Point";
  return `"${snippet}"${who}\n${POST_WEB_BASE}${p.id}`;
}
