# Funciones del plan: desglose

Funciones aprobadas para el nivel de pago, con lo que hace falta para construir cada una. Todas son del perfil completo (plan activo, Original o dentro de la prueba de 3 meses); un local con perfil básico las ve bloqueadas con el candado de siempre.

Orden recomendado: 1, 4, 3, 2.

## 1. Botón de pedido por WhatsApp

**Qué es.** En el perfil del local aparece "Pedir por WhatsApp". Abre el chat con el mensaje ya escrito: "Hola, quiero hacer un pedido en {local}. Te encontré en El Point." La cocina fantasma ya tiene un botón "Pedir" parecido; esto lo generaliza a cualquier local con plan y le da forma.

**Qué ve cada quien**
- Comensal: botón "Pedir" junto a "Ir" y en la fila de contacto.
- Dueño: interruptor "Recibo pedidos por WhatsApp" en su perfil, y un número nuevo en Métricas: pedidos iniciados.
- Local sin plan: el botón no existe (las cocinas fantasma conservan su WhatsApp gratis, como hoy).

**Piezas**
- Base de datos: columna `restaurants.accepts_orders boolean default false`; permitir el evento `order` en `restaurant_events` (hoy hay `view`, `whatsapp`, `call`, `directions`, `instagram`, `menu`, `blocked`).
- App: `lib/contact.ts` arma el mensaje; botón en `app/restaurant/[id].tsx`; interruptor en `app/(owner)/profile.tsx`; tarjeta en `app/(owner)/analytics.tsx`.
- Fase 2, cuando exista el menú con precios (función 3): el comensal marca platos y el mensaje sale con la lista y el total.

**Esfuerzo:** medio día. **Riesgo:** ninguno técnico. El mensaje debe ser corto para que no se corte en el enlace.

## 2. Comparativa del dueño

**Qué es.** Una tarjeta en Métricas: "Eres el 3.º de 9 en Pizza en San Cristóbal" y "Tus visitas: 128. Promedio de tu categoría: 74".

**Datos que ya existen:** `rating_avg` y `rating_count` por local, categorías por local, y `restaurant_events` para las visitas.

**Piezas**
- Una función de base de datos `get_category_benchmark(restaurant_id, days)` que devuelve solo agregados: puesto por calificación dentro de su categoría principal, total de locales de esa categoría, visitas del local y visitas promedio de la categoría. Nunca devuelve datos de otros locales por separado. Solo para el dueño con plan.
- App: tarjeta en `app/(owner)/analytics.tsx` con un texto en lenguaje llano y una barra "tú vs. promedio".
- Regla para que no engañe: si la categoría tiene menos de 3 locales, se muestra "Aún no hay suficientes locales para comparar".

**Esfuerzo:** un día. **Riesgo:** con pocos locales por categoría la comparación es débil; por eso el mínimo de 3. Cuando haya más locales, mejora sola.

## 3. Plato del día y menú con precios

**Qué es.** Un menú dentro de la app, por secciones, con precio, no solo el PDF. Un plato puede marcarse "Plato del día" y se ve primero.

**Qué ve cada quien**
- Comensal: sección "Menú" en el perfil con platos, precio en dólares y su equivalente en bolívares a la tasa del día (ya existe `lib/queries/exchangeRate.ts`). El plato del día sale destacado arriba.
- Dueño: editor de menú en su perfil. Agrega, edita, oculta o agota un plato, y marca el del día.

**Piezas**
- Base de datos: tabla `menu_items` (`restaurant_id`, `section`, `name`, `description`, `price_usd`, `photo_url` opcional, `available`, `is_daily_special`, `position`). Lectura pública solo si el local tiene plan (la política usa `restaurant_has_plan`). Escritura solo del dueño con plan.
- Aviso de plato del día a favoritos: se reutiliza el mecanismo de promos (`notify_favoriters_on_promo`) con un límite de un aviso por día.
- App: componente de menú en el detalle, y editor en el perfil del dueño con reordenar y secciones.
- Compatible con el PDF: el PDF sigue existiendo para quien lo prefiera.

**Esfuerzo:** de dos a tres días, es la más grande. **Riesgo:** que los dueños no mantengan los precios al día. Mitigación: mostrar "Actualizado hace N días" en el menú y el aviso semanal al dueño.

## 4. Kit QR "Rankéanos"

**Qué es.** Un PDF imprimible con el QR del local: "Escanea y deja tu rank". Va en la caja o en las mesas. Más reseñas para el local y más contenido para la app.

**Piezas**
- Un enlace estable por local, por ejemplo `https://elpoint-app.netlify.app/r/{id}`, que abre la app en ese local o, si no está instalada, lleva a la tienda. Necesita configurar enlaces profundos en la app y una página `r/` en la landing.
- App del dueño: botón "Descargar mi QR" que genera el PDF (QR más el nombre del local y la marca) con `expo-print` y una librería de QR.
- Variante para ventanas y para mesas (tamaño tarjeta).

**Esfuerzo:** un día y medio. **Dependencia:** la app publicada en la App Store, o al menos los enlaces profundos configurados en la build. Hasta entonces el QR podría llevar a la landing.

## Otras ideas sin aprobar

- Insignia "Verificado" para locales con plan activo y datos revisados.
- Reportes mensuales por WhatsApp para el dueño.
- Varias sucursales bajo una sola cuenta.
