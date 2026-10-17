export type Faq = { q: string; a: string };

/** Preguntas frecuentes del dueño de un local. */
export const OWNER_FAQ: Faq[] = [
  {
    q: "¿Por qué no se ven mi contacto, mi menú ni mis fotos?",
    a: "Esas secciones se muestran a los comensales solo con un plan activo. Mira el estado de tu plan en Perfil → Ajustes → Mi plan.",
  },
  {
    q: "¿Cómo cambio la portada, el logo o las fotos?",
    a: "En Mi local → Fotos. Arriba van la portada y el logo; debajo, tu galería de hasta 9 fotos. Mantén una foto pulsada para cambiarla de lugar.",
  },
  {
    q: "¿Cómo publico el plato del día?",
    a: "En Mi local → Menú, marca un plato como plato del día. Se quita solo a medianoche, o lo mantienes si prefieres. Avisamos a quienes te tienen en favoritos.",
  },
  {
    q: "¿Cómo pauso mi local un tiempo?",
    a: "En Perfil → Ajustes del local → Editar, apaga “Local visible”. Cuando quieras volver, lo enciendes.",
  },
  {
    q: "¿Cómo consigo más reseñas?",
    a: "En Mi local → Cartel QR “Rankéanos”. Imprímelo y ponlo en la caja o en las mesas: quien lo escanea llega directo a tu local para calificarte.",
  },
  {
    q: "¿Puedo cambiar las categorías de mi local?",
    a: "Sí, hasta 3. Entra a Perfil → Datos del negocio → Editar.",
  },
];

/** Preguntas frecuentes del comensal. */
export const CUSTOMER_FAQ: Faq[] = [
  {
    q: "¿Cómo dejo una reseña?",
    a: "Entra al perfil del local y califica con estrellas, y si quieres, con fotos y un comentario. Puedes dejar una reseña por semana en cada local.",
  },
  {
    q: "¿Por qué algunos locales no muestran teléfono o WhatsApp?",
    a: "Porque el local aún no tiene su perfil completo activo. Puedes seguirlos en favoritos y te avisamos de sus novedades.",
  },
  {
    q: "¿Cómo sé si un local está abierto?",
    a: "En el perfil verás “Abierto ahora” según el horario que cargó el local. Si no aparece, el local aún no lo ha publicado.",
  },
  {
    q: "¿Qué es una cocina fantasma?",
    a: "Un negocio sin local físico que vende por delivery o pickup. No sale como pin en el mapa, pero lo encuentras en Buscar.",
  },
  {
    q: "¿Cómo cambio mi contraseña o borro mi cuenta?",
    a: "Desde Ajustes, en tu perfil. Ahí también puedes cambiar el modo claro u oscuro y las notificaciones.",
  },
  {
    q: "¿Cómo reporto un local o una reseña?",
    a: "Escríbenos desde aquí, en “Reportar un local”, con el nombre y qué pasó. Lo revisamos.",
  },
];
