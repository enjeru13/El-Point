# Comunidad: feed de posts sobre comida

Fecha: 2026-11-03 · Estado: borrador para aprobar

## Intención

Una sección nueva de la app, parecida a Threads pero solo de comida, donde la gente publica sobre locales de San Cristóbal, locales que aún no están en El Point, recetas y temas de comida.

Por qué:

1. **Interacción:** hoy la app solo se abre para decidir dónde comer o para dejar un rank. Comunidad da un motivo para volver sin ir a comer.
2. **Captar locales nuevos:** cada post que menciona un local que no está en la app es una señal de demanda. Llega al panel admin como sugerencia y el operador puede contactar al local con pruebas de que la gente lo busca.

Éxito: los comensales publican y responden por su cuenta, y las sugerencias de locales se convierten en altas.

## Objetivos

- Feed cronológico de posts de comida, con filtros por tema y por categoría de comida.
- Todo post va ligado a la comida: lleva un tema y al menos un local (de la app o escrito a mano) o una categoría.
- Los ranks existentes aparecen en el feed, para que no esté vacío al lanzar.
- Los locales con plan activo pueden publicar, con límites.
- Moderación al nivel de las reseñas: reportar, bloquear, ocultar automáticamente y resolver desde el panel.

## Fuera de la v1

Repost, citar, mensajes directos, seguir usuarios, feed por algoritmo, formato propio de receta (ingredientes y pasos), video, menciones a usuarios (@) y edición de posts publicados (solo borrar).

El XP por interactuar sí entra en la v1: ver "XP en Comunidad".

## Lo que no puede pasar

- Que el feed se vuelva un Threads general (política, peleas, temas ajenos). Por eso cada post lleva tema y local o categoría obligatorios.
- Que se llene de publicidad de locales. Por eso hay límites y un interruptor global.
- Que tenga menos garantías de contenido de usuarios que las reseñas. Apple 1.2 exige reportar, bloquear y filtrar.
- Precios de planes o pasos de pago dentro de la app (Apple 3.1.1). Que publicar como local sea una ventaja del plan se puede mencionar, pero sin precios.

## Decisiones tomadas con el usuario

- Sección nueva en la barra de navegación del comensal: `Inicio · Mapa · Comunidad · Explorar · Perfil`, con Comunidad en el centro. "Comunidad" es nombre provisional.
- Se aprovecha para revisar el diseño de la barra entera.
- Publican **todos los comensales**.
- Entre los locales, publican **solo los que tienen plan activo** (`restaurant_has_plan`: Original, en prueba o al día).
- Temas de interés, recetas incluidas.

## Diseño

### Temas (lista fija)

| Tema | Quién lo usa | Para qué |
|---|---|---|
| Recomiéndame | comensales | Preguntas: "¿dónde como buen mondongo?" |
| Locales nuevos | comensales | Un local que descubrieron o vieron abrir |
| Recetas | comensales | Cómo preparar algo en casa |
| Antojos | comensales | Temas sueltos de comida |
| Novedades | solo locales | Plato del día, promo, horario especial |
| Reseñas | automático | Los ranks; nadie lo elige al publicar |

La lista vive en la app y en un `check` de la base de datos. No hace falta tabla porque cambia muy poco.

### Etiquetas de un post

- **Tema:** uno, obligatorio.
- **Local:** opcional, como mucho uno. Puede ser un local de la app (`restaurant_id`) o uno escrito a mano (`suggested_name`, más un texto libre de zona opcional). Nunca los dos.
- **Categorías:** de 0 a 2, de la tabla `categories` existente.
- Regla: tiene que haber local o al menos una categoría. Los posts de local llevan su propio local de forma automática.

### Qué tiene un post

- Texto de 1 a 500 caracteres.
- Hasta 4 fotos, comprimidas en el teléfono antes de subir con el mismo flujo que las fotos de reseñas (`lib/storage.ts`).
- Me gusta, respuestas de un solo nivel, reportar, borrar el propio y bloquear al autor.

### Ranks dentro del feed

El feed mezcla dos fuentes ordenadas por fecha: los posts y las reseñas visibles. Una reseña se ve como post del tema "Reseñas", con estrellas, foto y local. Se puede tocar para ir al rank, y su "me gusta" es el `review_helpful` que ya existe. Las respuestas a reseñas siguen siendo las de siempre (`review_replies`, una por reseña y solo del dueño). En la v1 los comensales no responden reseñas desde el feed.

Cómo implementarlo queda a criterio del constructor: una vista `community_feed` (`union all`) o una función RPC paginada por cursor (`created_at`, `id`). El requisito es una sola consulta paginada que respete la moderación y los bloqueos de ambas fuentes.

### Plan gratuito (decidido con el usuario)

- Los comensales pueden etiquetar cualquier local aprobado, tenga plan o no.
- La tarjeta del local dentro de un post muestra solo lo gratuito: nombre, categoría y zona. El resto se ve, como siempre, en su perfil según el plan.
- "Lo que dicen en Comunidad" sale en el perfil de todos los locales: es contenido de la gente, como las reseñas.
- Un dueño sin plan no publica ni responde como local.

### Publicar como local

- El dueño publica desde su barra con un botón en "Mi local" o en Inicio de dueño. No se le añade pestaña.
- El post sale con el nombre y la foto del local y una marca de "Local". El autor real (`author_id`) es el dueño, y además se guarda `as_restaurant_id`.
- Tema fijo "Novedades", con su local etiquetado de forma automática.
- **Un post cada 24 h por local**, controlado en el servidor con un trigger, igual que `enforce_review_rate_limit`.
- **Solo responde en posts que mencionan su local.** El servidor lo controla.
- **Interruptor global** (`owner_posts_enabled`) que el operador cambia desde el panel admin. Apagado, ningún local puede publicar ni responder como local; los posts ya publicados siguen visibles. Va en una tabla de ajustes de una sola fila, si no existe ya una que sirva.
- Si el local pierde el plan, ya no puede publicar. Sus posts anteriores se quedan.
- **Acceso del dueño (decisión del asistente):** el dueño no tiene pestaña nueva. En su Inicio hay una entrada "Comunidad" que abre el mismo feed como pantalla apilada, y en "Mi local" una lista "Te mencionan" con los posts que etiquetan su local. Desde ahí lee el feed entero, da me gusta, reporta y responde. Todo lo que hace dentro de Comunidad sale como su local (`as_restaurant_id` siempre informado). Nueva notificación `post_mention` cuando un post etiqueta su local.
- **Strikes de posts como local (decisión del asistente):** si al local le retiran (`removed`) 3 posts o respuestas, pierde el permiso de publicar como local (`restaurants.community_banned_at`), pero eso no cuenta como strike para la cuenta personal del dueño. Sus reseñas personales y su perfil siguen igual. El admin puede devolverle el permiso.

### Límites para comensales

Para evitar spam: como máximo 10 posts y 60 respuestas por día y por usuario. Los usuarios con `banned_at` no publican, igual que en las reseñas.

### Moderación (mismo modelo que las reseñas)

- Reportar un post o una respuesta, una vez por usuario, con los mismos motivos (`offensive`, `spam`, `false`, `other`).
- Con 3 o más reportes distintos se oculta de forma automática (`moderation = 'hidden'`) hasta que el admin lo resuelva. Si el dueño de un local reporta un post que menciona su local, cuenta como un reporte normal: no basta para ocultarlo, a diferencia de las reseñas.
- El admin lo deja `visible` o lo pasa a `removed`, y eso suma un strike al autor con las mismas reglas de 3 strikes.
- Las columnas protegidas usan el mismo patrón de trigger de guarda que `guard_review_moderation_cols`.
- Bloqueos: no se ven posts ni respuestas de usuarios bloqueados, filtrados con el mismo `Set` de `lib/queries/blocks.ts`.

### XP en Comunidad (decidido con el usuario)

El XP premia lo que otros valoran, no la cantidad de publicaciones. Hoy un rank vale +10 y cada "útil" recibido +2.

| Acción | XP | Límite |
|---|---|---|
| Publicar un post | +3 | solo los 3 primeros posts del día |
| Tu post recibe un me gusta | +1 | de otra persona, nunca el propio |
| Alguien responde tu post | +1 | una vez por persona y post |
| Tu respuesta etiqueta un local de la app en un post "Recomiéndame" | +2 | 5 al día |
| Un local que sugeriste pasa a `alta` | +25 | solo quien lo sugirió primero |
| Dar me gusta o responder | 0 | — |

- **Tope de 20 XP al día** por persona sumando todo lo de Comunidad. No afecta al XP de los ranks ni al de las misiones.
- **Se descuenta** si se borra el post o la respuesta, si quitan el me gusta o si moderación los retira (`removed`). Se usa el mismo patrón que `xp_clawback`, con marca para no descontar dos veces.
- **Los locales no suman XP:** todo lo que se hace con `as_restaurant_id` vale 0.
- **Misiones nuevas** de una sola vez: `first_post` "Tu primer post en Comunidad" (+20) y `brought_local` "Trajiste un local a El Point" (+50, al pasar a `alta` el primer local que sugeriste).
- Todo el XP pasa por `award_xp()`. El tope diario se lleva en el servidor; cómo implementarlo (tabla de registro o columna diaria) queda a criterio del constructor.

### Curva de niveles más suave (decidido con el usuario)

La curva actual (`50 × (nivel − 1)²`) pide 57.800 XP para Leyenda: unos 8 años incluso para un usuario muy activo. Pasa a ser **`50 × (nivel − 1)^1,5`**, redondeado:

| Rango | Nivel | XP hoy | XP nuevo |
|---|---|---|---|
| Comensal | 4 | 450 | 260 |
| Explorador | 9 | 3.200 | 1.131 |
| Crítico Local | 16 | 11.250 | 2.905 |
| Gurú Gastronómico | 25 | 28.800 | 5.879 |
| Leyenda | 35 | 57.800 | 9.913 |

- Los rangos y sus tramos de niveles no cambian. Solo cambia el XP necesario por nivel.
- Se cambia en un solo sitio por plataforma: la función SQL del nivel (`award_xp` y la función que calcula nivel desde XP) y el cálculo de la app (`lib/queries/me.ts` y `app/rank-info.tsx`). Ambos tienen que dar exactamente el mismo resultado.
- Se recalcula el nivel de todos los usuarios. Solo puede subir, y el recálculo **no** genera notificaciones de subida de nivel.
- La landing no cambia: muestra niveles, no XP.
- Puede salir antes que Comunidad, pero necesita build nuevo como el resto.

### Datos (resumen)

- `posts`: `id, author_id, as_restaurant_id null, topic, body, restaurant_id null, suggested_name null, suggested_zone null, like_count, reply_count, moderation, moderated_at, created_at`.
- `post_categories (post_id, category_id)`, de 0 a 2 por post.
- `post_photos (post_id, storage_path, position)`.
- `post_likes (user_id, post_id)`.
- `post_replies`: `id, post_id, author_id, as_restaurant_id null, body, moderation, created_at`.
- `post_reports`: igual que `review_reports`, apuntando a un post o a una respuesta.
- Contadores mediante triggers. RLS en todo: lectura para `authenticated`, escritura solo sobre lo propio y moderación solo por funciones `security definer`.
- `notifications.type` gana `post_like` y `post_reply`. Se avisa al autor cuando le responden o le dan me gusta, agrupando los me gusta si hace falta.

### App

- Cabecera de Comunidad igual que la de Inicio (decidido con el usuario): `ScreenHeader` con `AppLogo` a la izquierda y, a la derecha, un botón de buscar en Comunidad y la `NotificationBell` existente. Sin título grande "Comunidad": la pestaña activa ya lo dice.
- Pestaña Comunidad: arriba una fila de chips de tema y otra de categorías; feed con scroll infinito y refrescar al tirar hacia abajo; botón flotante "Publicar".
- Pantalla para publicar: tema, texto, fotos, local (buscador de locales de la app con la opción "No está en El Point, escríbelo") y categorías.
- Detalle del post con sus respuestas.
- Perfil del local: nueva sección "Lo que dicen en Comunidad" con los posts que lo etiquetan.
- Barra de navegación del comensal rediseñada a 5 pestañas.

### Experiencia de uso (requisito del usuario: "tiene que ser divina de usar")

La UI y la UX son un objetivo de primer nivel, no un acabado del final. Comunidad no se da por terminada solo porque funcione: tiene que sentirse rápida, cuidada y propia de El Point.

**Proceso**
- Antes de programar cada pantalla (feed, publicar, detalle, barra de navegación y "Te mencionan"), se hace una maqueta que el usuario ve y aprueba, igual que se hizo con la landing.
- Se usan las skills `impeccable` (diseño y revisión) y `design-motion-principles` (movimiento), y al final hay una revisión de diseño de cada pantalla.
- Todo se prueba en el iPad con el development build, no solo en la web.

**Referentes del usuario:** Threads y X para el feed y las respuestas, e Instagram para los posts con fotos. Estética minimalista y muy limpia. Traducido a El Point:
- Posts como filas, no como tarjetas: avatar a la izquierda, nombre y hora en una línea, texto debajo y acciones en una fila discreta de íconos con su número. Separadores finos, sin sombras ni cajas.
- Fotos a lo ancho del contenido, con esquinas suaves. Si son varias, en carrusel deslizable con indicador de puntos, como Instagram. Al tocarlas se abren a pantalla completa con gesto para cerrar.
- Las respuestas, en hilo con una línea vertical que une avatar y respuestas, como Threads.
- La etiqueta del local es una píldora pequeña y tocable debajo del texto. El tema va en texto pequeño junto a la hora. Nada de colores chillones: el naranja de marca solo en el me gusta activo, la etiqueta del local y el botón de publicar.
- Inspirarse no es copiar: la tipografía, los íconos y el naranja siguen siendo los de El Point, para que se reconozca como propio.

**Lo que se tiene que sentir**
- **Instantáneo:** el me gusta, la respuesta y el post propio aparecen al momento (actualización optimista con React Query) y se revierten solos si el servidor falla. Nada de esperar con un spinner tras tocar.
- **Fluido:** el scroll del feed va sin tirones, con fotos cargadas por `expo-image` (caché y transición suave) y paginación que se adelanta antes de llegar al final.
- **Táctil:** vibración ligera (`expo-haptics`) al dar me gusta y al publicar, y animaciones con `react-native-reanimated` que acompañan sin estorbar, siempre con su alternativa para "reducir movimiento".
- **Publicar sin fricción:** abrir, escribir y publicar en pocos toques. El teclado nunca tapa lo que escribes, las fotos muestran su progreso de subida y el borrador no se pierde si sales sin querer. Los selectores de local y categoría van en hojas inferiores (`@gorhom/bottom-sheet`, ya instalado).
- **Estados cuidados:** esqueletos al cargar; un feed vacío o un filtro sin resultados con un mensaje que invita a publicar; errores con opción de reintentar; sin conexión, se avisa sin romper la pantalla.
- **Legible y accesible:** modo claro y oscuro, textos con buen contraste, objetivos táctiles de al menos 44 pt, etiquetas para lectores de pantalla y tamaños de letra del sistema respetados.
- **Coherente:** mismos colores, tipografía e íconos que el resto de la app. La barra de navegación nueva se diseña junto con Comunidad, no se le añade una pestaña sin más.

### Panel admin (admin-web)

- **Posts reportados:** cola como `ReportedReviews` para posts y respuestas.
- **Locales sugeridos:** lista de `suggested_name` agrupados por nombre normalizado, con cantidad de posts, zona y fecha del último, para contactar al local y darlo de alta.
  - *Decisión del asistente:* tabla `local_suggestions (normalized_name pk, status, restaurant_id null, updated_at)` con estados `pendiente → contactado → alta | descartado`. Al pasar a `alta` se elige el local creado (`restaurant_id`). Los posts siguen guardando su `suggested_name`, pero la app los muestra enlazados a ese local mediante la sugerencia, y aparecen en "Lo que dicen en Comunidad". Así no se reescriben los posts de los usuarios y la conversión se puede medir.
  - Un post nuevo con un nombre `descartado` no vuelve a abrir la sugerencia. Uno con un nombre en `alta` se enlaza solo.
- **Ajustes:** el interruptor `owner_posts_enabled`.

## Restricciones

- Expo SDK 54, expo-router v6, NativeWind (nunca `style={({pressed}) => [array]}` en Pressable: NativeWind lo descarta); React Query; Supabase.
- Todo en español de Venezuela, tuteando.
- Una sola persona opera: todo lo de moderación debe resolverse desde el panel en pocos clics.
- La app está en revisión de Apple. Esto va en una versión nueva con build nuevo (hay cambios de navegación y de esquema), no por EAS Update a `production`. Se puede desarrollar contra el development build del iPad.

## A criterio del constructor

- Vista o función RPC para el feed combinado, y la estrategia de índices.
- Normalización de nombres para agrupar locales sugeridos (minúsculas, sin tildes, sin "restaurante" ni "el/la").
- Íconos y diseño visual de la pestaña y de las tarjetas, coherentes con la app.
- Orden de entrega en fases, siempre que cada fase quede usable.
