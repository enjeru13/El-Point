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

/**
 * Un precio en USD como textos por moneda, en el orden pedido (solo las monedas
 * pedidas y con tasa disponible). Siempre devuelve al menos el precio en USD.
 */
export function priceLines(usd: number, currencies: ("usd" | "bs" | "cop")[], rates: Rates): string[] {
  const out: string[] = [];
  for (const c of currencies) {
    if (c === "usd") {
      out.push("$" + usd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else if (c === "bs" && rates.bs) {
      out.push("Bs " + (usd * rates.bs).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else if (c === "cop" && rates.cop) {
      // Pesos: se redondea a la cincuentena, así se leen y se pagan en la práctica.
      out.push("COP " + (Math.round((usd * rates.cop) / 50) * 50).toLocaleString("es-VE", { maximumFractionDigits: 0 }));
    }
  }
  return out.length ? out : ["$" + usd.toFixed(2).replace(".", ",")];
}
