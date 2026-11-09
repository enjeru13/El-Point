// Monedas del menú: conversión, formato y avisos de tasa.
// Módulo puro (sin React Native) para poder probarlo con `node --test`.

export type Cur = "usd" | "bs" | "cop";

export type Rates = { bs: number | null; cop: number | null };

const ORDER: Cur[] = ["usd", "bs", "cop"];

/** Convierte un monto entre monedas pasando por dólares; null si falta la tasa. */
export function convertAmount(amount: number, from: Cur, to: Cur, rates: Rates): number | null {
  if (from === to) return amount;
  const perUsd = (c: Cur) => (c === "usd" ? 1 : c === "bs" ? rates.bs : rates.cop);
  const rf = perUsd(from);
  const rt = perUsd(to);
  if (!rf || !rt) return null;
  return (amount / rf) * rt;
}

/** Texto de un monto en una moneda. `exact` = lo escribió el dueño, no se redondea. */
export function formatMoney(value: number, c: Cur, exact = false): string {
  if (c === "usd") return "$" + value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (c === "bs") return "Bs " + value.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Pesos: el dueño escribe el número tal cual; lo calculado se redondea a la cincuentena.
  const v = exact ? value : Math.round(value / 50) * 50;
  return "COP " + v.toLocaleString("es-VE", { maximumFractionDigits: 0 });
}

/**
 * Un precio guardado en la moneda base como textos por moneda, con la base
 * primero. Las monedas sin tasa disponible se omiten; la base siempre sale.
 */
export function priceLines(amount: number, base: Cur, currencies: Cur[], rates: Rates): string[] {
  const out: string[] = [formatMoney(amount, base, true)];
  for (const c of currencies) {
    if (c === base) continue;
    const v = convertAmount(amount, base, c, rates);
    if (v != null) out.push(formatMoney(v, c));
  }
  return out;
}

/** Monedas que el comensal puede elegir: la base siempre, las demás solo si hay tasa. */
export function availableCurrencies(currencies: Cur[], base: Cur, rates: Rates): Cur[] {
  return ORDER.filter((c) => c === base || (currencies.includes(c) && convertAmount(1, base, c, rates) != null));
}

/** Moneda con la que arranca el selector: la recordada, si no dólares, si no la base. */
export function initialCurrency(available: Cur[], base: Cur, remembered: Cur | null): Cur {
  if (remembered && available.includes(remembered)) return remembered;
  if (available.includes("usd")) return "usd";
  return base;
}

// Venezuela no tiene horario de verano: UTC-4 todo el año.
const CARACAS_OFFSET_MS = -4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function caracasDay(ms: number): number {
  return Math.floor((ms + CARACAS_OFFSET_MS) / DAY_MS);
}

/** Días calendario (hora de Caracas) desde que se actualizó la tasa. */
export function rateAgeDays(updatedAt: string | null, now: Date): number | null {
  if (!updatedAt) return null;
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, caracasDay(now.getTime()) - caracasDay(t));
}

/** Texto bajo la tasa: de dónde sale y qué tan vieja es. */
export function rateNote(kind: "bs" | "cop", own: boolean, ageDays: number | null): { text: string; stale: boolean } {
  if (!own) return { text: kind === "bs" ? "Tasa BCV de hoy" : "Tasa del día", stale: false };
  if (ageDays == null) return { text: "Tasa del local", stale: false };
  if (ageDays > 7) return { text: `Tasa de hace ${ageDays} días, confirma con el local`, stale: true };
  if (ageDays === 0) return { text: "Tasa del local · actualizada hoy", stale: false };
  if (ageDays === 1) return { text: "Tasa del local · actualizada ayer", stale: false };
  return { text: `Tasa del local · actualizada hace ${ageDays} días`, stale: false };
}

/**
 * Monto escrito por el dueño ("1,50", "1.500", "1.500,50"). Con los dos
 * separadores, el último es el decimal. Con solo puntos: varios o "1.500" en
 * Bs/COP son miles; si no, decimal. Null si no es un monto válido (> 0).
 */
export function parseMoneyInput(raw: string, base: Cur): number | null {
  const s = raw.trim().replace(/\s/g, "");
  if (!/^[0-9.,]+$/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;
  if (lastComma > -1 && lastDot > -1) {
    normalized = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    normalized = s.split(",").length > 2 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1) {
    const parts = s.split(".");
    const thousands = parts.length > 2 || (base !== "usd" && parts[1].length === 3);
    normalized = thousands ? s.replace(/\./g, "") : s;
  } else {
    normalized = s;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0 || n > 100000000) return null;
  return n;
}
