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
