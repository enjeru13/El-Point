/** "ahora", "12 min", "3 h", "2 d", "5 sem": la hora corta de una fila del feed. */
export function shortAgo(iso: string, now: number = Date.now()): string {
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d`;
  return `${Math.floor(d / 7)} sem`;
}
