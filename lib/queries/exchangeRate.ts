import { useQuery } from "@tanstack/react-query";

// dolarapi.com espeja la tasa oficial (BCV) que publica el propio Banco de
// Venezuela — no hay API de conciliación bancaria real disponible para un
// negocio chico, esto es solo la tasa del día para mostrarle al dueño
// cuántos Bs son 10 USD, no para verificar pagos automáticamente.
const BCV_URL = "https://ve.dolarapi.com/v1/dolares/oficial";

async function fetchBcvRate(): Promise<number | null> {
  try {
    const res = await fetch(BCV_URL);
    if (!res.ok) return null;
    const json = await res.json();
    const rate = Number(json?.promedio);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

/** Tasa BCV (Bs por USD) del día, cacheada unas horas. `null` si no se pudo
 *  obtener — quien la use debe caer a un texto genérico en ese caso. */
export function useBcvRate() {
  return useQuery({
    queryKey: ["bcv-rate"],
    queryFn: fetchBcvRate,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

export function formatBs(amountUsd: number, rate: number): string {
  return (amountUsd * rate).toLocaleString("es-VE", { maximumFractionDigits: 2 });
}

// Pesos colombianos por dólar. API pública sin llave que publica tasas de
// mercado del día; solo para mostrar equivalencias en el menú.
const COP_URL = "https://open.er-api.com/v6/latest/USD";

async function fetchCopRate(): Promise<number | null> {
  try {
    const res = await fetch(COP_URL);
    if (!res.ok) return null;
    const json = await res.json();
    const rate = Number(json?.rates?.COP);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

/** Tasa COP por USD del día, cacheada unas horas. `null` si no se pudo obtener. */
export function useCopRate() {
  return useQuery({
    queryKey: ["cop-rate"],
    queryFn: fetchCopRate,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

export type Rates = { bs: number | null; cop: number | null };

type Cur = "usd" | "bs" | "cop";

/** Tasas efectivas del local: las propias si las puso, y si no la BCV y la automática del día. */
export function useEffectiveRates(own: { bsRate: number | null; copRate: number | null }) {
  const bcv = useBcvRate();
  const cop = useCopRate();
  const rates: Rates = { bs: own.bsRate ?? bcv.data ?? null, cop: own.copRate ?? cop.data ?? null };
  return { rates, bsLocal: own.bsRate != null, copLocal: own.copRate != null, loading: bcv.isLoading || cop.isLoading };
}

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
