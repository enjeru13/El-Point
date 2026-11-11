# Versión 1.2.0: cambios y mejoras por hacer

Lista de trabajo. Cuando cada punto esté hecho y probado, se pasa a las notas de `lib/changelog.ts` (1.2.0), `landing/novedades.html` y el texto "Novedades de esta versión" de la App Store. Hasta entonces no se anuncian.

Estado: `[ ]` pendiente · `[x]` hecho

## Para verificar y arreglar

- [ ] **Teclado en iOS.** Al comentar un post (y en pantallas parecidas) es difícil bajar el teclado si no queda un espacio en blanco donde tocar. Solución a probar: `keyboardDismissMode="interactive"` o `"on-drag"` en las listas, y cerrar el teclado al tocar fuera. Pantallas: `app/community/[id].tsx`, `app/community/new.tsx`, `app/restaurant/[id].tsx` y la hoja de pedido.
- [x] **Logo cortado con letra grande (iPhone X).** Es el logo "el Point" de la barra de arriba (`components/ui/AppLogo.tsx`): el texto crecía con el tamaño de letra del sistema dentro de una caja de alto fijo y se cortaba por abajo. Arreglo: el logo ya no escala con la letra del sistema (`allowFontScaling={false}`). Falta probarlo en un iPhone con letra grande.
- [ ] **Imágenes de las reseñas dentro de cada local.** En la sección de reseñas de un local no se pueden abrir las fotos de los comentarios. Hay que abrirlas a pantalla completa, con deslizar entre fotos.
- [ ] **Zoom en las fotos de la galería del local.** Que el comensal pueda ampliar con pellizco las imágenes que sube el local (portada y galería).

## Para construir

- [ ] **Más categorías de comida.** Ampliar la lista. Referencia: migraciones `20260910213000_categories_revamp.sql` y `20261009*`, y el ícono de cada una en `components/ui/Icon.tsx`. Hay que decidir cuáles (ver abajo).
- [x] **Responder y abrir hilos en las reseñas de Comunidad.** Hecho en código (falta correr la migración `20261112000000_review_threads.sql` y probar en el teléfono). Cada reseña con respuestas tiene un "post-hilo" (`posts.review_id`); las respuestas reutilizan avisos, menciones, XP y moderación de los posts. Tocar una reseña en el feed abre su conversación; el local queda en su tarjeta. Pruebas SQL: `supabase/tests/review_threads.sql`.
- [x] **Menú en imágenes sin gastar las 9 fotos de la galería.** Hecho en código (falta correr la migración `20261112010000_menu_images.sql` y probar en el teléfono). Tabla propia `restaurant_menu_images`, tope de 10, misma regla de plan que la galería. El dueño la edita al final de Mi local → Menú; el comensal la ve en una tira "Menú en imágenes" sobre el botón del PDF, con visor y zoom. Pruebas SQL: `supabase/tests/menu_images.sql`.

## Preguntas abiertas

1. Categorías nuevas: ya van pasteles o desayunos y cachapas; el usuario pasa el resto de la lista.
2. Imágenes de menú por local: 10 (confirmado).
3. ¿Video promocional del local? Idea aparte de las 9 fotos, ver conversación del 2026-11-11.
4. En las reseñas de Comunidad, ¿las respuestas las ve solo quien abre la reseña o también salen en el feed como en los posts?
