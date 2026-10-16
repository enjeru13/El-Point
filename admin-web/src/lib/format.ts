/** WhatsApp de Venezuela a formato internacional sin "+": "0414-1234567" → "584141234567". */
export function waNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (!d) return null;
  if (d.startsWith("58")) return d;
  if (d.length === 10 && d.startsWith("4")) return "58" + d;
  if (d.length >= 11 && d.length <= 15) return d;
  return d.length <= 11 ? "58" + d : d;
}

export function waLink(raw: string | null | undefined, text?: string): string | null {
  const n = waNumber(raw);
  if (!n) return null;
  return text ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : `https://wa.me/${n}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtMoney(n: number): string {
  return "US$" + n.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
