export type ReleaseSection = {
  title: string;
  icon: string;
  notes: string[];
};

export type Release = {
  version: string;
  date: string; // "Octubre de 2026"
  /** Una línea que resume la versión. */
  headline?: string;
  sections: ReleaseSection[];
};

/**
 * Más reciente primero.
 *
 * La versión sube solo con un build nuevo (la que ve la tienda). Las
 * actualizaciones por OTA no cambian el número: sus novedades se suman a la
 * versión vigente.
 */
export const CHANGELOG: Release[] = [
  {
    version: "1.2.0",
    date: "Noviembre de 2026",
    headline: "Comunidad se vuelve conversación: responde a otros, menciona, vota en encuestas y comparte afuera.",
    sections: [
      {
        title: "Conversaciones",
        icon: "message-circle",
        notes: [
          "Responde a otras respuestas: los hilos se ven ordenados, con “Respondiendo a @usuario”.",
          "Dale me gusta a las respuestas que te gusten.",
          "Menciona a cualquiera con @ y le llega el aviso.",
          "Toca la foto o el @ de alguien para ver su perfil: nivel, rango, ranks y lo que publicó.",
        ],
      },
      {
        title: "Encuestas",
        icon: "mdi:poll",
        notes: [
          "Crea encuestas de 2 a 4 opciones: texto libre o locales de El Point.",
          "Duran 1, 3 o 7 días; votar es anónimo, puedes cambiar tu voto y suma XP.",
          "Al cerrar te avisamos qué opción ganó.",
        ],
      },
      {
        title: "Comparte",
        icon: "send",
        notes: [
          "Comparte cualquier publicación fuera de la app: quien no tiene El Point la ve completa en la web.",
          "Íconos nuevos y más redondos en Comunidad.",
        ],
      },
      {
        title: "Avisos",
        icon: "bell-outline",
        notes: [
          "Tocar un aviso te lleva justo a donde pasó.",
          "Nuevo ajuste “Comunidad” y “Logros y rachas” en Ajustes.",
          "Las promos solo llegan si las activas.",
        ],
      },
    ],
  },
  {
    version: "1.1.0",
    date: "Noviembre de 2026",
    headline: "Llegó Comunidad, y ahora armas tu pedido desde el menú y lo mandas por WhatsApp.",
    sections: [
      {
        title: "Comunidad",
        icon: "comment-text-multiple",
        notes: [
          "Nueva pestaña Comunidad: pide recomendaciones, cuenta tus descubrimientos, comparte recetas y responde a otros comensales.",
          "Filtra por tema o por tipo de comida, busca publicaciones y etiqueta locales de la app.",
          "Participar te da XP, con misiones nuevas como tu primer post.",
          "Cada local muestra lo que la comunidad dice de él.",
        ],
      },
      {
        title: "Pedidos y menú",
        icon: "shopping-bag",
        notes: [
          "Arma tu pedido desde el menú: agrega platos, ajusta cantidades y mándalo listo por WhatsApp.",
          "Elige si pasas a buscarlo o es delivery, y marca en el mapa dónde te lo llevan.",
          "La tasa del local se ve grande arriba del menú, con su fecha, y eliges ver los precios en dólares, bolívares o pesos.",
          "Al compartir un local, el enlace abre la app o lleva a descargarla.",
        ],
      },
      {
        title: "Para dueños de locales",
        icon: "storefront-outline",
        notes: [
          "Recibe pedidos armados desde tu menú y configura el costo del delivery: precio fijo o según la zona.",
          "¿Tu local ya aparece en El Point? Reclámalo desde su perfil y hazlo tuyo.",
          "Responde en Comunidad como tu local.",
        ],
      },
    ],
  },
  {
    version: "1.0.0",
    date: "Octubre de 2026",
    headline: "Llegó El Point: encuentra dónde comer en San Cristóbal y deja tu rank.",
    sections: [
      {
        title: "Para comensales",
        icon: "silverware-fork-knife",
        notes: [
          "Descubre locales por categoría, cercanía y si están abiertos ahora, con mapa y filtros.",
          "Busca por nombre, categoría, comodidades y métodos de pago.",
          "En cada local: fotos, menú con precios, horario, promociones y contacto directo por WhatsApp, llamada o Instagram.",
          "Pide por WhatsApp con el mensaje listo.",
          "Deja tu rank con estrellas, fotos y comentario. Gana XP, sube de nivel y de rango.",
          "Guarda favoritos y recibe avisos de promos, del plato del día y de platos agotados.",
          "Cocinas fantasma: delivery y pickup de negocios sin local físico.",
          "Modo claro y oscuro, notificaciones y acceso con Apple o Google.",
        ],
      },
      {
        title: "Para dueños de locales",
        icon: "storefront-outline",
        notes: [
          "Registra tu local y aparece en el mapa con tu perfil básico, gratis.",
          "Con el plan se ve todo: contacto, menú con precios en dólares, bolívares o pesos, plato del día, galería de hasta 9 fotos, horario, promos, comodidades y métodos de pago.",
          "Responde las reseñas de tus clientes y consigue más con tu cartel QR “Rankéanos”.",
          "Métricas de 7, 30 y 90 días: visitas, contactos, canales y tus mejores días.",
          "Los primeros 100 locales son Originales: perfil completo gratis para siempre.",
        ],
      },
    ],
  },
];
