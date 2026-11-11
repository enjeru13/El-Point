// Qué puede ver alguien que abre la app sin cuenta. Módulo puro (sin React Native)
// para probarlo con `node --test`.
//
// Un visitante puede explorar: inicio, mapa, búsqueda, la página de un local
// (menú, tasas, fotos, reseñas y pedir por WhatsApp), Comunidad en lectura y los
// textos legales. Todo lo que guarda algo suyo (favoritos, ranks, publicaciones,
// avisos, perfil) pide cuenta en el momento (ver components/AuthGate.tsx).

/** Primer segmento de la ruta donde un visitante puede quedarse. */
const GUEST_ROOTS = new Set([
  "(customer)",
  "(auth)",
  "restaurant",
  "community",
  "legal",
  "onboarding",
  "changelog",
  "rank-info",
]);

/**
 * ¿Puede un visitante estar en esta ruta? Sin ruta (arranque) sí: se resuelve
 * enseguida. Cualquier otra (panel del dueño, ajustes, admin, perfil de otros…)
 * lo devuelve al inicio.
 */
export function guestMayStayOn(root: string | undefined): boolean {
  return root === undefined || GUEST_ROOTS.has(root);
}

export type GateReason =
  | "favorite"
  | "rank"
  | "helpful"
  | "post"
  | "reply"
  | "like"
  | "vote"
  | "report"
  | "block"
  | "notifications"
  | "profile"
  | "claim"
  | "generic";

/** Textos de la hoja "Crea tu cuenta para…". Español de Venezuela, sin emojis. */
export const GATE_COPY: Record<GateReason, { icon: string; title: string; body: string }> = {
  favorite: {
    icon: "heart",
    title: "Guarda tus favoritos",
    body: "Crea tu cuenta gratis para guardar los locales que te gustan y volver a ellos cuando quieras.",
  },
  rank: {
    icon: "star",
    title: "Deja tu rank",
    body: "Con tu cuenta calificas el local, subes fotos y ganas XP por ayudar a otros a elegir.",
  },
  helpful: {
    icon: "thumb-up",
    title: "Marca lo que te sirvió",
    body: "Crea tu cuenta para decir qué reseñas te ayudaron y que las demás personas las vean primero.",
  },
  post: {
    icon: "pencil",
    title: "Publica en Comunidad",
    body: "Con tu cuenta pides recomendaciones, compartes lo que descubres y creas encuestas.",
  },
  reply: {
    icon: "message-circle",
    title: "Únete a la conversación",
    body: "Crea tu cuenta para responder, mencionar a otras personas y debatir en Comunidad.",
  },
  like: {
    icon: "heart",
    title: "Dale me gusta",
    body: "Crea tu cuenta para reaccionar a lo que publica la comunidad.",
  },
  vote: {
    icon: "mdi:poll",
    title: "Vota en la encuesta",
    body: "Crea tu cuenta para votar. Tu voto es anónimo y puedes cambiarlo mientras esté abierta.",
  },
  report: {
    icon: "flag",
    title: "Reporta contenido",
    body: "Crea tu cuenta para reportar lo que no corresponde. Un moderador lo revisa.",
  },
  block: {
    icon: "account-cancel",
    title: "Bloquea a alguien",
    body: "Crea tu cuenta para dejar de ver a una persona.",
  },
  notifications: {
    icon: "bell-outline",
    title: "Tus avisos",
    body: "Con tu cuenta te avisamos de respuestas, menciones y del plato del día de tus favoritos.",
  },
  profile: {
    icon: "account",
    title: "Tu perfil",
    body: "Crea tu cuenta para tener tu perfil, tu nivel, tus ranks y tus favoritos.",
  },
  claim: {
    icon: "storefront-outline",
    title: "Reclama tu local",
    body: "Crea tu cuenta de dueño para administrar tu local en El Point.",
  },
  generic: {
    icon: "account",
    title: "Crea tu cuenta",
    body: "Es gratis y toma menos de un minuto.",
  },
};
