// Normaliza datos de contacto que el dueño escribe a mano (WhatsApp, Instagram)
// a URLs que abren de verdad. Mercado: Venezuela (código de país 58).

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Devuelve el número en formato internacional sin "+" (lo que espera wa.me),
 * o null si no hay nada usable.
 *
 * Acepta: "0412-1234567", "412 1234567", "+58 412 1234567", "584121234567".
 */
export function whatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = onlyDigits(raw);
  if (!d) return null;

  d = d.replace(/^0+/, ""); // quita el 0 de tronco local

  if (d.startsWith("58")) return d; // ya viene con código de país
  if (d.length === 10 && d.startsWith("4")) return "58" + d; // móvil VE nacional
  if (d.length >= 11 && d.length <= 15) return d; // ya trae algún código de país
  if (d.length <= 11) return "58" + d; // mejor esfuerzo: asume VE

  return d;
}

export function whatsappUrl(
  raw: string | null | undefined,
  text?: string,
): string | null {
  const n = whatsappNumber(raw);
  if (!n) return null;
  return text
    ? `https://wa.me/${n}?text=${encodeURIComponent(text)}`
    : `https://wa.me/${n}`;
}

/** Handle de Instagram a partir de "@local", "local" o una URL pegada. */
export function instagramHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let h = raw.trim();
  const m = h.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  if (m) h = m[1];
  h = h.replace(/^@+/, "").trim();
  return h || null;
}

export function instagramUrl(raw: string | null | undefined): string | null {
  const h = instagramHandle(raw);
  return h ? `https://instagram.com/${h}` : null;
}
