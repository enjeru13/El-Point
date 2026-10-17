/** La promo vigente de un local: su texto, o null si no hay o ya venció. */
export function activePromo(r: { promo_text?: string | null; promo_ends_at?: string | null } | null | undefined): string | null {
  const text = r?.promo_text?.trim();
  if (!text) return null;
  if (r?.promo_ends_at && new Date(r.promo_ends_at).getTime() <= Date.now()) return null;
  return text;
}

export type PromoDuration = "today" | "3d" | "7d" | "none";

export const PROMO_DURATIONS: { key: PromoDuration; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "3d", label: "3 días" },
  { key: "7d", label: "1 semana" },
  { key: "none", label: "Sin fecha" },
];

/** Fin de la promo: la medianoche (hora de Caracas) del último día. `none` = sin fecha. */
export function promoEndsAt(d: PromoDuration, now = new Date()): string | null {
  if (d === "none") return null;
  const days = d === "today" ? 0 : d === "3d" ? 2 : 6;
  const target = new Date(now.getTime() + days * 86_400_000);
  const ymd = target.toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
  return new Date(`${ymd}T23:59:59-04:00`).toISOString();
}

/** "Termina hoy", "Termina mañana", "Termina en 3 días" o "Sin fecha de fin". */
export function promoEndLabel(endsAt: string | null | undefined, now = new Date()): string {
  if (!endsAt) return "Sin fecha de fin";
  const left = new Date(endsAt).getTime() - now.getTime();
  if (left <= 0) return "Vencida";
  const days = Math.ceil(left / 86_400_000);
  const endDay = new Date(endsAt).toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
  const today = now.toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
  if (endDay === today) return "Termina hoy";
  if (days <= 1) return "Termina mañana";
  return `Termina en ${days} días`;
}
