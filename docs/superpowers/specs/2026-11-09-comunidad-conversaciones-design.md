# Comunidad 2: conversaciones, encuestas, compartir y notificaciones

Fecha: 2026-11-09
Estado: borrador para aprobación (revisado por un builder)

## Por qué

Comunidad salió en la 1.1.0. Hoy solo se puede responder a la publicación: no se puede responder a otra respuesta, ni darle me gusta, ni mencionar a nadie. Una publicación buena tampoco se puede mostrar fuera de la app.

El dueño de El Point quiere darle "mucho amor" a Comunidad, porque si la gente la usa "puede ser un boom". La meta es que dentro de cada publicación se arme conversación y debate, y que lo bueno salga de la app y traiga gente nueva.

Referencia visual: Threads (hilos con línea, botones redondos, "Autor").

## Metas

1. Responder a una respuesta, con hilos visibles.
2. Darle me gusta a una respuesta.
3. Mencionar a cualquier usuario con @.
4. Encuestas en las publicaciones.
5. Compartir una publicación fuera de la app, con una página web que la muestre completa.
6. Íconos de acciones más bonitos y consistentes (estilo Threads).
7. Notificaciones: arreglar las que fallan, agregar las que faltan y dar un interruptor "Comunidad" en Ajustes.

## No metas

- Repostear. En El Point todos ven el mismo feed y no hay perfiles con seguidores, así que repostear solo duplicaría. Se retoma si algún día hay perfiles.
- Seguidores (sí hay perfil público, sección 3b, pero sin seguir a nadie).
- Vista previa con el texto del post en WhatsApp (Open Graph por publicación). La landing se sube a mano a Netlify; sin servidor no se genera.
- Notificaciones fuera de Comunidad que no son urgentes:
  - platos nuevos o eventos de un favorito,
  - avisarle al dueño que guardaron su local,
  - pago anulado,
  - local fusionado.
- GIF, stickers y editar publicaciones.

## Anti-metas

- Que las conversaciones se vuelvan ilegibles en pantallas pequeñas (sangrías infinitas).
- Que las menciones o los avisos se usen para molestar o spamear.
- Que la página web pública muestre datos privados o publicaciones ocultas por moderación.
- Que el feed se vuelva más lento.
- Emojis como íconos en la interfaz: siempre íconos de la app.

## Lo que existe hoy

Esquema en `20261105010000_community_schema.sql`:
- tablas `posts`, `post_photos`, `post_likes`, `post_replies` (sin padre), `post_reports`, `local_suggestions`;
- `community_xp_log`, con tope diario de XP.

Moderación en `20261105010300`, escritura en `20261105010200` y feed en `20261105010400`. **Las versiones vigentes** de las notificaciones de respuesta y me gusta y de `community_removed` están en `20261105030000_review_fixes.sql` y `20261105040000_community_polish.sql`: hay que partir de esas.

La ruta del detalle en la app es `community/[id]` y el esquema es `elpoint`.

En la app, los componentes de Comunidad están en `components/community/` y la pantalla del post en `app/community/`.

Push: un trigger AFTER INSERT sobre `notifications` envía cada fila a Expo con `pg_net` (`20260907230619_push_notifications.sql`). Cada tipo de notificación se filtra según un ajuste del usuario (`push_setting_key`).

## Diseño

### 1. Respuestas en hilo

- `post_replies` gana `parent_reply_id uuid null` (referencia a `post_replies`, on delete set null) y `like_count int`.
- **Un solo nivel de sangría visual.**
  - Una respuesta a la publicación va al nivel 0.
  - Una respuesta a una respuesta de nivel 0 queda debajo, en el nivel 1, unida con una línea vertical como en Threads.
  - Una respuesta a una del nivel 1 se queda en el nivel 1, debajo de la misma raíz, y arriba dice "Respondiendo a @usuario".
- Orden:
  - raíces por antigüedad (como hoy);
  - dentro de cada raíz, sus respuestas por antigüedad;
  - se muestran 2 y luego "Ver N respuestas más".
- Cada respuesta tiene:
  - corazón con contador,
  - burbuja para responder (llena el campo con "Respondiendo a @x"),
  - ••• (reportar o bloquear, como hoy).
- Etiqueta **"Autor"** en las respuestas de quien publicó. Etiqueta **"Local"** cuando responde como local (`as_restaurant_id`).
- Moderación igual que hoy. Una respuesta quitada que tiene respuestas debajo se muestra como "Respuesta eliminada", para que el hilo no se rompa.
- (Decisión del diseñador) **Borrar la propia respuesta**:
  - sin respuestas debajo, se borra de verdad, como hoy;
  - con respuestas debajo, queda "Respuesta eliminada" (borrado suave con `moderation = 'removed'` y sin texto), para que los hijos sigan colgando de ella.
  - Se hace con una RPC `delete_my_reply` en lugar del `delete` directo.

### 2. Me gusta en respuestas

- Tabla nueva `post_reply_likes(reply_id, user_id, created_at)` con clave primaria compuesta y `like_count` mantenido por trigger, igual que `post_likes`.
- Suma XP a quien escribió la respuesta, con una clave única por me gusta en `community_xp_log` y dentro del tope diario.
- Me gusta optimista en la app, igual que en los posts.

### 3. Menciones

- Se puede mencionar a **cualquier usuario** de El Point.
- Al escribir `@` en el campo de respuesta o de post aparecen sugerencias:
  - primero quienes participan en esa publicación,
  - luego la búsqueda por nombre de usuario.
- (Decisión del diseñador) La notificación usa un **tipo nuevo `user_mention`**. El `post_mention` de hoy (un post etiquetó tu local, aviso al dueño) no cambia y sigue con el ajuste de Reseñas. Hay que agregar `user_mention` al check de `notifications.type` y a `AppNotification`.
- Se guardan en una tabla `post_mentions(post_id, reply_id null, user_id)`. Las crea una función del servidor, que lee los `@usuario` del texto y los valida.
- Límites:
  - máximo 5 menciones por texto;
  - quien te bloqueó o a quien bloqueaste no se puede mencionar (se ignora sin error).
- En el texto, la mención se ve resaltada y se puede tocar: abre el perfil público (sección 3b).

### 3b. Perfil público de usuario

Al tocar una mención, o el nombre o la foto de quien publica o responde, se abre una pantalla nueva `app/user/[id].tsx`. Está armada con las mismas piezas del perfil propio (`app/(customer)/profile.tsx`), pero solo para ver:
- foto con la insignia de nivel, @usuario y bio;
- tarjeta de nivel y rango, sin la barra de XP ni los textos de racha;
- cantidad de ranks;
- logros conseguidos, con el mismo componente;
- pestañas "Comunidad" (sus publicaciones, con el mismo `FeedRow`) y "Ranks" (sus reseñas visibles).

No muestra favoritos, ni botón de editar, ni ajustes, ni correo. Si es tu propio perfil, va a la pestaña Perfil.

Datos: RPC `get_public_profile(p_user_id)`, SECURITY DEFINER, con solo esos campos. Si hay bloqueo entre las dos personas, o la cuenta está vetada de Comunidad, devuelve "no disponible".

En el ••• del perfil: "Bloquear" (ya existe `useBlockUser`). Los reportes siguen siendo por publicación o respuesta.

### 4. Encuestas

- Desde la barra de herramientas de "Nuevo post", botón **Encuesta**.
- De 2 a 4 opciones. Cada opción es:
  - **texto libre** (1 a 60 caracteres), o
  - **un local de El Point**, elegido con el mismo buscador de locales del post y mostrado como tarjeta que se puede abrir.
  - Se pueden mezclar.
- Duración: 1, 3 o 7 días (por defecto 1).
- Tablas:
  - `post_polls(post_id pk, closes_at)`;
  - `post_poll_options(id, post_id, position, label null, restaurant_id null)`, con check de que haya texto o local, no los dos;
  - `post_poll_votes(post_id, user_id, option_id)`, con un voto por persona y por encuesta.
- Votar:
  - se toca la opción y se puede cambiar el voto mientras esté abierta;
  - los votos son anónimos: solo se ven los totales;
  - los resultados (barras con porcentaje y total de votos) aparecen después de votar, o al cerrar.
- Al cerrar:
  - queda en el feed con el resultado final y la ganadora resaltada;
  - aviso a quien la creó: "Tu encuesta terminó: ganó X con N%".
- Votar da XP dentro del tope diario: **2 XP, decisión del diseñador**.
- La encuesta es una publicación más: sigue en el feed, se puede responder, dar me gusta y compartir.

### 5. Compartir fuera de la app

- Botón de compartir (avión de papel) en cada publicación, en el feed y en el detalle. Abre `Share` con:
  > "{primeras 120 letras}" — @{usuario} en Comunidad de El Point
  > https://elpoint-app.netlify.app/p?id={post_id}
- Página nueva `landing/p/index.html`, igual que `landing/l/`:
  - intenta abrir `elpoint://community/{post_id}` (la ruta real del detalle; quien construya verifica el nombre);
  - muestra la **publicación completa**:
    - autor (nombre de usuario, nivel y rango), tema y fecha;
    - texto, fotos y local etiquetado;
    - encuesta con resultados;
    - contadores de me gusta y respuestas;
    - las 2 primeras respuestas;
  - al final, "Únete a la conversación" con el botón de App Store.
  - (Decisión del diseñador) En Android muestra "Muy pronto en Android" en lugar del botón, hasta que la app salga en Play. Si la app no está instalada, la página se queda mostrando la publicación: el intento de abrir la app falla en silencio, como en `landing/l/`.
- Datos: RPC nueva `get_public_post(p_id uuid)`, SECURITY DEFINER y concedida a `anon`.
  - Devuelve solo publicaciones con `moderation = 'visible'`, de autores que no estén vetados de Comunidad, y solo los campos de arriba.
  - Nunca devuelve correo ni ids internos de usuario.
  - Las fotos se sirven con la URL pública que ya usa la app.
- La página usa la URL de Supabase y la llave anónima, que ya son públicas en la app.
- Publicación inexistente, oculta o con id inválido: "Esta publicación ya no está disponible", con el botón para conocer El Point.

### 6. Íconos

En todos los lugares de Comunidad (feed, detalle, respuestas), con la misma familia de íconos (lucide) que ya usa la app:
- corazón,
- burbuja redonda (estilo Threads, en lugar del ícono actual),
- avión de papel.

Mismo tamaño y grosor, con el número al lado. Sin emojis en la interfaz.

### 7. Notificaciones

**Arreglos:**
1. **Tocar el push** (`components/PushBridge.tsx`) debe llevar al mismo lugar que tocar en la lista (`NotificationsSheet`). Hoy la lista ya resuelve `post` y `subscription`, pero el push no. Ninguna de las dos resuelve `claim_approved` ni `community_removed`. Se unifican en una sola función de navegación por tipo:
   - `post` y menciones al post;
   - `post_mention` al post, no al local;
   - `subscription` a "Mi plan";
   - `claim_approved` al panel del dueño;
   - `community_removed` a la pantalla de Comunidad.
2. **Promos:** el servidor trata un ajuste que no existe como "no enviar" para `promo`, igual que el valor por defecto de la app (`notifPromos` en false).
3. **Suspender o reactivar un local:** la revisión dijo que se mandan dos avisos, pero `admin_set_restaurant_status` ya manda uno solo. Primero hay que reproducirlo con una prueba SQL. Si no se reproduce, se descarta.
4. **Misiones y rachas** (`mission`, `streak`):
   - tienen ícono propio en la lista;
   - entran en el tipo `AppNotification`;
   - se silencian con su propio ajuste "Logros y rachas", no con "Subir de nivel".
5. **Ajuste "Comunidad"** (`notifCommunity`) en Ajustes, para comensales y dueños. (Decisión del diseñador) Reemplaza a `notifRanks` y `notifReplies` para los tipos de Comunidad. Arranca encendido, salvo para quien había apagado `notifReplies`: una migración copia ese valor. Cubre:
   - me gusta y respuestas a tus posts,
   - respuestas a tus respuestas,
   - me gusta en tus respuestas,
   - menciones,
   - encuesta terminada.

**Nuevas:**
- Respuesta a tu respuesta: "@x respondió tu comentario".
- Mención: "@x te mencionó".
  - No se manda si es la misma persona.
  - Si la persona mencionada ya recibe el aviso de respuesta por ese mismo texto, no se duplica.
- Me gusta en tu respuesta, agrupado igual que en los posts: no se crea otro mientras haya uno sin leer de esa respuesta.
- Encuesta terminada, para quien la creó. Lo crea un cron cada 15 minutos sobre las encuestas vencidas sin aviso.
- Aprobamos el local que sugeriste.
- Tu reseña fue retirada por moderación.

Todas usan `type` de Comunidad o `moderation` y un `data.kind` con lo necesario para navegar.

## Restricciones

- Expo SDK 54. Antes de escribir código hay que leer la documentación de la v54.
- Cada migración lleva su prueba SQL (`scripts/sqltest.mjs`), corrida contra la base enlazada en una transacción que se revierte.
- Las columnas nuevas de tablas con grants de columna necesitan su grant.
- Las funciones públicas son SECURITY DEFINER con `search_path` fijo y su `revoke` / `grant` explícito.
- Textos en español neutro de Venezuela, con "tú".
- NativeWind: nunca `style={({pressed}) => [array]}`.
- Nada de EAS Update a `production` sin que el dueño lo pida. Esto sale en la versión 1.2.0 (build nuevo) o por actualización, según decida el dueño.

## Lo que decide quien lo construya

- La forma exacta de la línea del hilo y los espaciados.
- Cómo se cargan las respuestas en el detalle (paginación) y la consulta del feed, mientras no se vuelva más lento.
- La animación al votar en una encuesta.
- El diseño de la página web `p/`, dentro del estilo de `landing/l/` y `landing/styles.css`.
