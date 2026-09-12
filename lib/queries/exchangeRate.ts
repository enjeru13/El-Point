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
