# Versión 1.3: lo que queda para después de la 1.2

Lista de trabajo. Nada de esto está construido. Se decide el alcance antes de empezar.

## Prioridad

1. **Rutas gastronómicas (misiones por categoría).** Logros por rankear locales distintos de una categoría: "Ruta del callejero" (perros, pepitos, hamburguesas, 5 locales), "Catador de morcillas" (3), "Hamburguesero" (3), "Ruta andina" (3), "Panadero de corazón" (5), "Rey de la cachapa" (3). Premio: XP e insignia en el perfil público. Avance visible ("2 de 3") en el perfil y en la página de los locales que cuentan. Pendiente: armar con el usuario la lista definitiva de rutas.
2. **Avisos para volver a la app (re-enganche).** Con permiso explícito y un interruptor para apagarlos (regla 4.5.4 de Apple), con límite de frecuencia. Por ejemplo: "Hay 3 locales nuevos cerca", "Tu racha está por romperse". Se hace con un cron en la base y la interfaz por actualización, sin build nativo.
3. **Revisión de seguridad.** Repasar políticas RLS, funciones SECURITY DEFINER, lo abierto a visitantes sin cuenta, el almacenamiento de fotos y los permisos del panel de admin.

## También

- **Visitas sin cuenta en las estadísticas del dueño.** Hoy no cuentan (`restaurant_events.viewer_id` es obligatorio). Con el modo visitante, los dueños ven menos visitas de las reales.
- **Google Maps en iOS** si Apple Maps sigue cargando en blanco en Venezuela (cambio nativo, necesita build).
- **Limpieza del almacenamiento** de fotos de cuentas y locales borrados.
- **Unificar Inicio, Mapa y Explorar**, que se parecen (los tres tienen buscador y filtros).

## Más adelante

- **Video promocional del local** (uno por local, 20 a 30 s, comprimido, aparte de las 9 fotos). Probable función de pago.
- **Rutas por temporada o patrocinadas** por locales (posible ingreso).
- Ideas de pago aún sin aprobar: kit QR "Rankéanos" imprimible e insignia "Verificado".
