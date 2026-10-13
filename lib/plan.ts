/**
 * Perfil básico (gratis) vs. perfil completo (plan).
 *
 * Todo local aprobado y activo es visible. "Tiene plan" = es Original
 * (founder_rank) o su paid_until está en el futuro; la prueba de 3 meses ya
 * fija paid_until, así que cuenta igual. Es la misma regla que
 * restaurant_has_plan() en la base de datos.
 *
 * Gratis: nombre, categorías, dirección y pin en el mapa; el dueño ve sus
 * reseñas. Con plan: contacto, menú, fotos, horario, promo, comodidades,
 * métodos de pago, responder reseñas, métricas y Destacado.
 */
export function hasPlan(
  r: { founder_rank?: number | null; paid_until?: string | null } | null | undefined,
): boolean {
  if (!r) return false;
  if (typeof r.founder_rank === "number") return true;
  return !!r.paid_until && new Date(r.paid_until).getTime() > Date.now();
}

/** Lo que el comensal ve de un local sin plan: todo esto llega vacío. */
export const FREE_TIER_BLANKS = {
  cover_url: null,
  logo_url: null,
  promo_text: null,
  boost_until: null,
} as const;

/** Qué incluye el plan, para mostrarlo al dueño (pantallas de plan y candados). */
export const PLAN_PERKS: { icon: string; label: string }[] = [
  { icon: "whatsapp", label: "WhatsApp, llamada e Instagram" },
  { icon: "file-document-outline", label: "Menú y fotos" },
  { icon: "clock-outline", label: "Horario y “abierto ahora”" },
  { icon: "tag-outline", label: "Promos con aviso a tus seguidores" },
  { icon: "message-reply-text-outline", label: "Responder reseñas" },
  { icon: "chart-line", label: "Métricas de quién te ve" },
  { icon: "fire", label: "Días de Destacado" },
];
