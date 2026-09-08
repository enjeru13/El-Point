export type Release = {
  version: string;
  date: string; // "8 de septiembre de 2026"
  notes: string[];
};

/** Más reciente primero. */
export const CHANGELOG: Release[] = [
  {
    version: "0.1.0",
    date: "8 de septiembre de 2026",
    notes: [
      "Primera versión de prueba de El Point.",
      "Descubre locales por categoría, cercanía y horario; mapa con marcadores.",
      "Deja tu rank con estrellas, fotos y comentario. XP, niveles y rangos.",
      "Favoritos, perfil de sabor y avisos de promociones.",
      "Registro de restaurantes con verificación y panel para dueños.",
      "Modo claro y oscuro, notificaciones push y pantallas legales.",
    ],
  },
];
