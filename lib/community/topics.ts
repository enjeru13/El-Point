// Temas de Comunidad y mensajes de error de la base de datos.
// Módulo puro (sin React Native) para poder probarlo con `node --test`.

export type TopicKey =
  | "recomiendame"
  | "locales_nuevos"
  | "recetas"
  | "antojos"
  | "novedades"
  | "resenas";

export const TOPICS: readonly { key: TopicKey; label: string }[] = [
  { key: "recomiendame", label: "Recomiéndame" },
  { key: "locales_nuevos", label: "Locales nuevos" },
  { key: "recetas", label: "Recetas" },
  { key: "antojos", label: "Antojos" },
  { key: "novedades", label: "Novedades" },
  { key: "resenas", label: "Reseñas" },
];

/** Los que un comensal puede elegir al publicar. */
export const CUSTOMER_TOPICS = TOPICS.filter(
  (t) => t.key !== "novedades" && t.key !== "resenas",
);

export function topicLabel(key: string): string {
  return TOPICS.find((t) => t.key === key)?.label ?? key;
}

const ERRORS: Record<string, string> = {
  not_authenticated: "Inicia sesión para participar en Comunidad.",
  user_banned: "Tu cuenta no puede publicar en este momento.",
  post_rate_limited: "Llegaste al máximo de 10 posts por hoy. Vuelve mañana.",
  reply_rate_limited: "Llegaste al máximo de 60 respuestas por hoy. Vuelve mañana.",
  post_needs_tag: "Etiqueta un local o al menos una categoría.",
  too_many_categories: "Elige como máximo 2 categorías.",
  invalid_topic: "Ese tema no está disponible.",
  restaurant_not_found: "Ese local ya no está disponible en El Point.",
  post_not_available: "Este post ya no está disponible.",
  owner_not_allowed: "Solo el dueño puede publicar como este local.",
  owner_posts_disabled: "Por ahora los locales no pueden publicar en Comunidad.",
  owner_no_plan: "Publicar como local es parte del plan activo de tu local.",
  owner_banned: "Tu local ya no puede publicar en Comunidad. Escríbenos a soporte.",
  owner_post_rate_limited: "Tu local ya publicó hoy. Puedes publicar de nuevo en 24 horas.",
  owner_reply_not_mentioned: "Tu local solo puede responder en posts que lo mencionan.",
};

/** Traduce el código que lanza la base de datos (error.message) a un texto para la persona. */
export function errorMessage(code: string): string {
  return ERRORS[code.trim()] ?? "No pudimos publicar. Inténtalo de nuevo.";
}
