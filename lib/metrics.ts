/**
 * Cálculos de la pantalla Métricas del dueño: periodos, comparación con el
 * periodo anterior, visitas por día, canales de contacto e interpretación en
 * una frase. Todo con fechas en hora de Caracas (YYYY-MM-DD).
 */

export type DailyRow = { event_type: string; day: string; total: number };

export const PERIODS = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIODS)[number];

export const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", icon: "whatsapp" },
  { key: "directions", label: "Cómo llegar", icon: "map-marker-outline" },
  { key: "call", label: "Llamadas", icon: "phone-outline" },
  { key: "menu", label: "Menú", icon: "book-open-outline" },
  { key: "instagram", label: "Instagram", icon: "instagram" },
  { key: "order", label: "Pedidos", icon: "cart-outline" },
] as const;

/** Los canales que cuentan como "contacto" (cómo llegar y menú son interés, no contacto). */
export const CONTACT_KEYS = ["whatsapp", "call", "instagram", "order"] as const;

export function caracasDay(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Los últimos `n` días terminando en `end` (incluido), del más viejo al más nuevo. */
export function lastDays(n: number, end: string = caracasDay()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

export function weekday(ymd: string): number {
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}

export type Summary = {
  /** Total por tipo de evento en el periodo actual. */
  current: Record<string, number>;
  /** Total por tipo de evento en el periodo anterior de la misma duración. */
  previous: Record<string, number>;
  /** Visitas por día del periodo actual, del más viejo al más nuevo. */
  visitsPerDay: { day: string; value: number }[];
  /** ¿Hay datos del periodo anterior? Sin ellos no se muestran flechas de comparación. */
  hasPrevious: boolean;
};

export function summarize(rows: DailyRow[], days: number, end: string = caracasDay()): Summary {
  const all = lastDays(days * 2, end);
  const prevSet = new Set(all.slice(0, days));
  const curSet = new Set(all.slice(days));
  const current: Record<string, number> = {};
  const previous: Record<string, number> = {};
  const visits = new Map<string, number>();
  let prevAny = false;
  for (const r of rows) {
    const t = Number(r.total) || 0;
    if (curSet.has(r.day)) {
      current[r.event_type] = (current[r.event_type] ?? 0) + t;
      if (r.event_type === "view") visits.set(r.day, (visits.get(r.day) ?? 0) + t);
    } else if (prevSet.has(r.day)) {
      previous[r.event_type] = (previous[r.event_type] ?? 0) + t;
      prevAny = true;
    }
  }
  return {
    current,
    previous,
    visitsPerDay: all.slice(days).map((day) => ({ day, value: visits.get(day) ?? 0 })),
    hasPrevious: prevAny,
  };
}

export function sumKeys(rec: Record<string, number>, keys: readonly string[]): number {
  return keys.reduce((s, k) => s + (rec[k] ?? 0), 0);
}

/** Variación porcentual; null si no hay base para comparar. */
export function pctChange(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

export type Bar = { label: string; value: number };

const WEEKDAY_INITIAL = ["D", "L", "M", "X", "J", "V", "S"];

/** Barras para una serie diaria: por día hasta 31 días; por semana para periodos largos. */
export function toBars(perDay: { day: string; value: number }[]): Bar[] {
  const n = perDay.length;
  if (n <= 7) return perDay.map((d) => ({ label: WEEKDAY_INITIAL[weekday(d.day)], value: d.value }));
  if (n <= 31) {
    return perDay.map((d, i) => ({
      label: i === 0 || i === n - 1 || i === Math.floor(n / 2) ? String(Number(d.day.slice(8))) : "",
      value: d.value,
    }));
  }
  const bars: Bar[] = [];
  for (let i = 0; i < n; i += 7) {
    const chunk = perDay.slice(i, i + 7);
    const first = chunk[0].day;
    bars.push({
      label: bars.length % 3 === 0 ? `${Number(first.slice(8))}/${Number(first.slice(5, 7))}` : "",
      value: chunk.reduce((s, d) => s + d.value, 0),
    });
  }
  return bars;
}

const DAY_NAMES = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"];

/** Los 1 o 2 días de la semana con más visitas, si hay datos suficientes para decirlo. */
export function bestWeekdays(perDay: { day: string; value: number }[]): string[] {
  const total = perDay.reduce((s, d) => s + d.value, 0);
  if (perDay.length < 7 || total < 10) return [];
  const sums = new Array(7).fill(0);
  for (const d of perDay) sums[weekday(d.day)] += d.value;
  const ranked = sums.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  if (ranked[0].v === 0) return [];
  const out = [DAY_NAMES[ranked[0].i]];
  if (ranked[1].v > 0 && ranked[1].v >= ranked[0].v * 0.7) out.push(DAY_NAMES[ranked[1].i]);
  return out;
}

/** Lectura corta de dónde estás frente a tu categoría, según el porcentaje de locales con menos visitas que tú. */
export function benchmarkVerdict(pctBelow: number, myViews: number, medianViews: number): { tone: "up" | "even" | "down"; text: string } {
  if (myViews === 0 && medianViews === 0) return { tone: "even", text: "Aún no hay visitas para comparar." };
  if (pctBelow >= 60) return { tone: "up", text: `Vas por delante del ${pctBelow}% de los locales de tu categoría.` };
  if (pctBelow >= 40) return { tone: "even", text: "Vas parejo con los locales de tu categoría." };
  return { tone: "down", text: "Hoy te ven menos que a la mayoría de tu categoría. Prueba una promo o el plato del día para atraer visitas." };
}

export function periodLabel(days: number): string {
  return days === 7 ? "Esta semana" : days === 30 ? "En los últimos 30 días" : "En los últimos 90 días";
}

/** Una frase que cuenta lo que pasó, en lenguaje llano. */
export function insightText(days: number, visits: number, contacts: number, best: string[]): string {
  if (visits === 0) return "Aún no hay visitas en este periodo. Comparte tu local y pon tu cartel QR en la caja o en las mesas.";
  const people = visits === 1 ? "1 persona vio" : `${visits} personas vieron`;
  const contactPart = contacts === 0 ? "nadie te ha contactado todavía" : contacts === 1 ? "1 te contactó" : `${contacts} te contactaron`;
  const bestPart = best.length ? ` Tus mejores días son los ${best.join(" y ")}.` : "";
  return `${periodLabel(days)} ${people} tu local y ${contactPart}.${bestPart}`;
}
