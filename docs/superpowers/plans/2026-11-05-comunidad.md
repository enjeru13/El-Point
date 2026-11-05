# Comunidad: plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** construir Comunidad, un feed de posts sobre comida con ranks mezclados, publicación limitada para locales con plan, moderación, XP por interacción y una curva de niveles más suave, más las páginas del panel admin.

**Arquitectura:**
- **Base de datos.** Todo lo que importa vive en Postgres: tablas con RLS, triggers para contadores, límites, moderación y XP, y funciones `security definer` para lo que el cliente no debe hacer directamente.
- **Crear y leer posts.** Los posts se crean con una RPC `create_post` que valida etiquetas y límites en una sola transacción. El feed se lee con una RPC paginada por cursor `community_feed` que une posts y reseñas visibles y filtra bloqueos en el servidor.
- **App y panel.** La app consume esas RPC con React Query (optimista en me gusta y respuestas). El panel admin usa los mismos patrones que `ReportedReviews`.

**Tecnología:** Expo SDK 54, expo-router v6, NativeWind, React Query 5, Supabase (Postgres, RLS, Storage), Vite + React (admin-web).

**Spec:** `docs/superpowers/specs/2026-11-03-comunidad-design.md`. Léelo antes de cada tarea: este plan no repite el porqué.

## Restricciones globales

- Expo SDK 54: consulta https://docs.expo.dev/versions/v54.0.0/ antes de usar cualquier API de Expo (`AGENTS.md`).
- NativeWind: nunca `style={({pressed}) => [array]}` en `Pressable`. Usa `className` o un objeto de estilo.
- Textos en español de Venezuela, tuteando, nunca voseo.
- Ni precios de planes ni pasos de pago dentro de la app (Apple 3.1.1). Se puede decir "con plan activo", sin montos.
- No publicar EAS Update al canal `production` mientras la app esté en revisión. Todo esto sale con build nuevo.
- Todo el XP pasa por `public.award_xp()`. El XP de Comunidad pasa además por `public.award_community_xp()` (Tarea 3), que aplica el tope.
- Día de Comunidad (topes y "primeros 3 posts del día"): día calendario en `America/Caracas`.
- Límites de los comensales: 10 posts y 60 respuestas en 24 h móviles. Locales: 1 post en 24 h móviles.
- Texto: post de 1 a 500 caracteres y respuesta de 1 a 500. Fotos: máximo 4 por post. Categorías: de 0 a 2 por post.
- Temas (claves de BD): `recomiendame`, `locales_nuevos`, `recetas`, `antojos`, `novedades`. `resenas` existe solo en el feed y nunca se guarda.
- Etiquetas en pantalla: Recomiéndame, Locales nuevos, Recetas, Antojos, Novedades, Reseñas.
- Pantallas nuevas: antes de programar cada una (feed, publicar, detalle, barra de navegación, "Te mencionan") hay una maqueta HTML que el usuario aprueba. Se usan las skills `impeccable` y `design-motion-principles`, y se prueba en el iPad con el development build.
- Commits en español, estilo `feat(comunidad): …`, terminando con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nunca push sin que el usuario lo pida.

## Cómo se prueba

**SQL.** No hay Docker ni Supabase local. Las pruebas SQL corren contra el proyecto enlazado dentro de una transacción que **siempre** termina en `rollback`, con las migraciones nuevas aún no aplicadas incluidas antes de la prueba.
- Lo hace `scripts/sqltest.mjs` (Tarea 1): `node scripts/sqltest.mjs <archivo-de-prueba.sql>`.
- Cada archivo de prueba crea sus propios usuarios falsos en `auth.users`, que desaparecen con el rollback.
- Las aserciones usan `raise exception`: una prueba pasa cuando el comando termina con código 0, y falla con el texto `FAIL: …`.
- Las migraciones se aplican de verdad (`npx supabase db push`) solo cuando el usuario lo pide, al cerrar cada fase.

**TypeScript puro.** `node --test` (Node 24 quita los tipos solo). Los módulos probados así no importan React Native ni alias `@/`: solo imports relativos.

**UI.** Se prueba en el iPad con el development build y Metro (`npx expo start --dev-client`), más `npx tsc --noEmit` y `npm run lint`.

## Foco de revisión

1. **Reintentos y toques dobles.** Doble toque en "Publicar" o reintento tras un error de red no crea dos posts. `create_post` recibe `p_client_id uuid`, que es único por autor, y repetirlo devuelve el mismo post. Prueba en la Tarea 4: `create_post_idempotent`.
2. **Quitar y volver a dar me gusta.** No da XP infinito. El XP de un me gusta usa una clave de origen única y se revierte al quitarlo. Volver a darlo concede de nuevo solo si el registro anterior se revirtió, y nunca más de un registro activo. Prueba en la Tarea 3: `like_unlike_relike_net_one`.
3. **Bloquear al autor de un post abierto en pantalla.** Desaparece del feed en la siguiente página y en el refresco sin romper el cursor. Prueba en la Tarea 6: `feed_hides_blocked_authors`, y en la Tarea 9 se invalida `community-feed` al bloquear.
4. **Dueño cuyo plan venció o que fue vetado.** Publicar falla con un mensaje claro en español y no con un error genérico. Prueba en la Tarea 5: `owner_post_requires_plan`, `owner_post_banned`. La UI mapea los códigos de error en la Tarea 9.
5. **Nombre sugerido con tildes, mayúsculas o "Restaurante El …".** Cae en la misma sugerencia. Prueba en la Tarea 2 (`normalize_place_name`) y en la Tarea 7 (`suggestion_grouping`).

---

## Fase 0: curva de niveles (puede salir antes que Comunidad)

### Tarea 1: Curva `50 × (L−1)^1,5` en SQL y en la app, más el runner de pruebas SQL

**Archivos:**
- Crear: `scripts/sqltest.mjs`
- Crear: `supabase/tests/level_curve.sql`
- Crear: `supabase/migrations/20261105000000_level_curve_smoother.sql`
- Crear: `lib/levels.ts`
- Crear: `lib/levels.test.ts`
- Modificar: `lib/queries/me.ts:160-170`. Quita `xpForLevel` y `levelForXp` locales y reexporta desde `../levels`.
- Revisar: `app/rank-info.tsx`. Busca también `xp_for_level|level_for_xp|xpForLevel|levelForXp` en el repo, incluidos `admin-web` y `landing`, y ajusta cada uso.

**Interfaces:**
- Produce `scripts/sqltest.mjs`.
  - Uso: `node scripts/sqltest.mjs <test.sql>`.
  - Arma un archivo temporal con `begin;`, las migraciones locales que no estén aplicadas en remoto (las detecta comparando con `npx supabase migration list --linked`), el archivo de prueba y `rollback;`.
  - Ejecuta `npx supabase db query --linked -f <tmp>` y sale con su código.
  - Antes de nada verifica que la Management API acepte varias sentencias con `begin/rollback`. Si no, la tarea se detiene y avisa al usuario.
- Produce, en SQL:
  - `public.xp_for_level(int) returns int`, igual a `round(50 * (L-1)^1.5)`.
  - `public.level_for_xp(int) returns int`: el mayor `L` con `xp_for_level(L) <= xp`, con mínimo 1 y máximo 1000.
- Produce, en TS: `xpForLevel(level: number): number` y `levelForXp(xp: number): number` en `lib/levels.ts`, con exactamente la misma definición.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`lib/levels.test.ts` (con `node:test` y `node:assert/strict`):

```ts
test("xp_por_nivel_tabla_del_spec", () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(4), 260);
  assert.equal(xpForLevel(9), 1131);
  assert.equal(xpForLevel(16), 2905);
  assert.equal(xpForLevel(25), 5879);
  assert.equal(xpForLevel(35), 9913);
});
test("nivel_por_xp_en_los_bordes", () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(-5), 1);
  assert.equal(levelForXp(259), 3);
  assert.equal(levelForXp(260), 4);
  assert.equal(levelForXp(9912), 34);
  assert.equal(levelForXp(9913), 35);
});
test("nivel_y_xp_son_inversos_hasta_60", () => {
  for (let l = 1; l <= 60; l++) assert.equal(levelForXp(xpForLevel(l)), l);
});
```

`supabase/tests/level_curve.sql` hace las mismas aserciones contra `public.xp_for_level` y `public.level_for_xp`, más estas dos:
- `levelup_no_notifica_al_recalcular`: el número de filas `notifications` de tipo `levelup` no cambia tras la migración.
- `nivel_recalculado`: no queda ninguna fila de `profiles` con `level <> level_for_xp(xp)`.

- [ ] **Paso 2: Ver que fallan**

Comandos:
- `node --test lib/levels.test.ts`: esperado FAIL, no encuentra el módulo `./levels`.
- `node scripts/sqltest.mjs supabase/tests/level_curve.sql`: esperado `FAIL: xp_for_level(4) = 450`.

- [ ] **Paso 3: Implementar la migración y `lib/levels.ts`**

La migración redefine las dos funciones y recalcula con un `update public.profiles set level = public.level_for_xp(xp) where level <> public.level_for_xp(xp);` directo, sin pasar por `award_xp`, para que no se generen notificaciones. La app importa de `lib/levels.ts` en `me.ts` y en `rank-info.tsx`.

- [ ] **Paso 4: Ver que pasan**

Comandos: los dos del Paso 2, más `npx tsc --noEmit`. Esperado: todo PASS y tsc sin errores.

- [ ] **Paso 5: Commit**

```bash
git add scripts/sqltest.mjs supabase/tests/level_curve.sql supabase/migrations/20261105000000_level_curve_smoother.sql lib/levels.ts lib/levels.test.ts lib/queries/me.ts app/rank-info.tsx
git commit -m "feat(niveles): curva más suave 50×(L−1)^1,5 en servidor y app"
```

---

## Fase 1: base de datos de Comunidad

Todas las migraciones de esta fase usan el prefijo `202611050100xx_` en orden. Cada tarea crea su archivo de prueba en `supabase/tests/comunidad/` y lo corre con `node scripts/sqltest.mjs`.

### Tarea 2: Esquema base (tablas, RLS, ajustes, normalización)

**Archivos:**
- Crear: `supabase/migrations/20261105010000_community_schema.sql`
- Crear: `supabase/tests/comunidad/schema.sql`

**Interfaces (produce):**
- `public.app_settings`: una sola fila, con `id boolean primary key default true check (id)` y `owner_posts_enabled boolean not null default true`. Todos los `authenticated` leen; solo el admin actualiza.
- `public.normalize_place_name(text) returns text`, `immutable`:
  - Pasa a minúsculas.
  - Quita tildes con `translate` (á→a, é→e, í→i, ó→o, ú→u, ü→u, ñ→n).
  - Quita las palabras sueltas `restaurante`, `restaurant`, `el`, `la`, `los`, `las`.
  - Colapsa espacios y hace `trim`.
- `public.posts`:
  - `id uuid pk`
  - `author_id uuid not null → profiles on delete cascade`
  - `as_restaurant_id uuid null → restaurants on delete cascade`
  - `topic text not null check (topic in ('recomiendame','locales_nuevos','recetas','antojos','novedades'))`
  - `body text not null check (char_length(body) between 1 and 500)`
  - `restaurant_id uuid null → restaurants on delete set null`
  - `suggested_name text null check (char_length between 2 and 80)`
  - `suggested_zone text null check (<= 80)`
  - `suggested_key text generated always as (public.normalize_place_name(suggested_name)) stored`
  - `client_id uuid not null`, con `unique (author_id, client_id)`
  - `like_count int not null default 0`, `reply_count int not null default 0`
  - `moderation text not null default 'visible' check (in 'visible','hidden','removed')`, `moderated_at timestamptz`
  - `created_at timestamptz not null default now()`
  - `check (not (restaurant_id is not null and suggested_name is not null))`
- `public.post_categories (post_id → posts cascade, category_id smallint → categories, pk (post_id, category_id))`.
- `public.post_photos (post_id → posts cascade, storage_path text, position smallint check 0..3, pk (post_id, position))`.
- `public.post_likes (user_id → profiles cascade, post_id → posts cascade, created_at, pk (user_id, post_id))`.
- `public.post_replies`:
  - `id uuid pk`, `post_id → posts cascade`, `author_id → profiles cascade`
  - `as_restaurant_id uuid null`
  - `restaurant_id uuid null → restaurants on delete set null`: el local de la app etiquetado en la respuesta, para el XP de Recomiéndame.
  - `body` de 1 a 500
  - `moderation`, `moderated_at`, `created_at`
- `public.post_reports`:
  - `id`, `post_id uuid null`, `reply_id uuid null`, `check (num_nonnulls(post_id, reply_id) = 1)`
  - `reporter_id`, `reason check in ('offensive','spam','false','other')`, `note <= 300`, `created_at`
  - Índices únicos parciales en `(post_id, reporter_id)` y `(reply_id, reporter_id)`.
- `public.local_suggestions`:
  - `normalized_name text pk`
  - `status text not null default 'pendiente' check (in 'pendiente','contactado','alta','descartado')`
  - `restaurant_id uuid null`, `updated_at`
  - `check (status <> 'alta' or restaurant_id is not null)`
- `restaurants.community_banned_at timestamptz null` y `restaurants.community_removals int not null default 0`.
- Índices:
  - `posts (created_at desc, id desc) where moderation = 'visible'`
  - `posts (restaurant_id, created_at desc)`, `posts (suggested_key)`, `posts (author_id, created_at desc)`
  - `post_replies (post_id, created_at)`, `post_reports (post_id)`, `post_reports (reply_id)`
- RLS:
  - `select` para `authenticated` en todo, excepto `post_reports` (solo el que reporta o el admin) y `local_suggestions` (solo el admin).
  - Sin `insert` directo en `posts` y `post_categories`: solo `create_post` (Tarea 4).
  - `post_photos`: insert solo si el post es del usuario.
  - `post_likes`: insert y delete del propio `user_id`.
  - `post_replies`: insert del propio `author_id`; delete del propio o del admin.
  - `posts`: delete del autor o del admin; update solo del admin, con columnas protegidas por guarda (Tarea 5).
  - `post_reports`: insert propio, sin reportar lo propio ni estando vetado (igual que `review_reports`).
  - Lo que lee `anon`: nada.
- Bucket de Storage `post-photos`, público y de 10 MB, con políticas iguales a `review-photos` (`20260901181525_review_photos_storage.sql`): ruta `{post_id}/{position}` y subida solo si `posts.author_id = auth.uid()`.

- [ ] **Paso 1: Escribir la prueba que falla `schema.sql`**

Aserciones:
- `normalize_place_name('Restaurante El Fogón  de Mamá')` devuelve `'fogon de mama'`.
- `normalize_place_name('FOGÓN DE MAMA')` devuelve `'fogon de mama'`.
- Insertar un post con `restaurant_id` y `suggested_name` a la vez da `check_violation`.
- Un post con `body` de 501 caracteres da `check_violation`.
- `app_settings` tiene exactamente 1 fila y `owner_posts_enabled = true`.
- Como un usuario `authenticated` cualquiera (`set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'`), `insert into posts` directo da `insufficient_privilege` y `select` de `local_suggestions` devuelve 0 filas.

- [ ] **Paso 2: Ejecutar `node scripts/sqltest.mjs supabase/tests/comunidad/schema.sql`.** Esperado: FAIL, la función `normalize_place_name` no existe.
- [ ] **Paso 3: Escribir la migración.**
- [ ] **Paso 4: Ejecutar la prueba de nuevo.** Esperado: PASS.
- [ ] **Paso 5: Commit** `feat(comunidad): esquema de posts, respuestas, reportes y sugerencias`.

### Tarea 3: Registro de XP de Comunidad con tope diario y descuento

**Archivos:**
- Crear: `supabase/migrations/20261105010100_community_xp.sql`
- Crear: `supabase/tests/comunidad/xp.sql`

**Interfaces:**
- Consume: `public.award_xp(uuid, int)` y las tablas de la Tarea 2.
- Produce `public.community_xp_log`:
  - `id bigint identity pk`, `user_id`, `amount int`
  - `reason text check in ('post','like_received','reply_received','recommendation','suggestion_alta')`
  - `post_id uuid null`, `actor_id uuid null`
  - `source_key text not null`, `day date not null`
  - `reverted boolean not null default false`, `created_at`
  - Índice único parcial `(source_key) where not reverted`.
  - Sin acceso de clientes.
- Produce `public.award_community_xp(p_user uuid, p_amount int, p_reason text, p_source_key text, p_post uuid, p_actor uuid) returns int`:
  1. Calcula `day = (now() at time zone 'America/Caracas')::date`.
  2. Si ya existe una fila activa con ese `source_key`, devuelve 0.
  3. Si no, concede `least(p_amount, 20 - suma activa del día)`, con mínimo 0. Inserta la fila aunque conceda 0, para que la clave quede usada.
  4. Llama a `award_xp` y devuelve lo concedido.
- Produce `public.revert_community_xp(p_source_key text) returns void`: marca `reverted` y llama a `award_xp(user, -amount)` si `amount > 0`. Si no hay fila activa, no hace nada.
- Produce `public.revert_community_xp_for_post(p_post uuid, p_user uuid) returns void`: revierte todas las filas activas de ese post que pertenecen a ese usuario.
- Claves de origen fijas (las usan las Tareas 4, 5 y 7):
  - `post:{post_id}`
  - `like:{post_id}:{liker_id}`
  - `reply:{post_id}:{replier_id}`
  - `rec:{reply_id}`
  - `alta:{normalized_name}`
- Triggers en esta tarea:
  - `post_likes` after insert: si quien da me gusta no es el autor y el post no tiene `as_restaurant_id`, otorga +1 `like_received` al autor. Además suma `like_count`.
  - `post_likes` after delete: `revert_community_xp('like:…')` y resta `like_count` con mínimo 0.
  - `posts` after delete: `revert_community_xp_for_post(old.id, old.author_id)`.

- [ ] **Paso 1: Escribir la prueba que falla `xp.sql`**

Con dos usuarios A (autor) y B, y un post de A creado con insert directo como `postgres`:
- `like_da_uno`: B da me gusta y el XP de A sube 1. `like_count` queda en 1.
- `like_propio_no_da`: A da me gusta a su propio post y su XP no cambia.
- `like_unlike_relike_net_one`: B da me gusta, lo quita y lo vuelve a dar. El XP neto de A es +1 y hay exactamente 1 fila activa con `like:{post}:{B}`.
- `tope_20_por_dia`: 25 llamadas a `award_community_xp(A, 1, 'like_received', 'k'||i, …)` suben el XP de A en exactamente 20, y la llamada 21 devuelve 0.
- `borrar_post_descuenta`: después de 3 me gusta de usuarios distintos, borrar el post devuelve el XP de A a su valor inicial.
- `post_de_local_no_da`: un post con `as_restaurant_id` recibe un me gusta y el XP de su autor no cambia.

- [ ] **Paso 2: Ejecutar `node scripts/sqltest.mjs supabase/tests/comunidad/xp.sql`.** Esperado: FAIL, `community_xp_log` no existe.
- [ ] **Paso 3: Escribir la migración.**
- [ ] **Paso 4: Ejecutar la prueba de nuevo.** Esperado: PASS.
- [ ] **Paso 5: Commit** `feat(comunidad): XP con tope diario y descuento`.

### Tarea 4: Crear posts y respuestas (límites, etiquetas, misiones, notificaciones)

**Archivos:**
- Crear: `supabase/migrations/20261105010200_community_write.sql`
- Crear: `supabase/tests/comunidad/write.sql`

**Interfaces:**
- Consume: Tareas 2 y 3, `public.restaurant_has_plan(uuid)`, `public.grant_mission(uuid, text)`, `public.mission_xp(text)` y `public.mission_title(text)`.
- Produce `public.create_post(p_client_id uuid, p_topic text, p_body text, p_restaurant_id uuid default null, p_suggested_name text default null, p_suggested_zone text default null, p_category_ids smallint[] default '{}', p_as_restaurant_id uuid default null) returns uuid`. Es `security definer`, con `grant execute` a `authenticated`. Errores con códigos de texto fijos (`raise exception '<código>'`) que la app traduce:
  - `not_authenticated`
  - `user_banned` (`profiles.banned_at` no nulo)
  - `post_rate_limited` (más de 10 en 24 h)
  - `post_needs_tag` (sin local y sin categorías)
  - `too_many_categories` (más de 2)
  - `invalid_topic` (un comensal usa `novedades`)
  - `restaurant_not_found` (el local etiquetado no está aprobado y activo)
  - Errores de dueño de la Tarea 5: `owner_not_allowed`, `owner_posts_disabled`, `owner_no_plan`, `owner_banned`, `owner_post_rate_limited`.
- Lo que hace `create_post`:
  - **Idempotente:** si existe `(author_id, client_id)`, devuelve ese id sin hacer nada más.
  - Inserta las categorías.
  - Con `suggested_key`:
    - Si no hay fila en `local_suggestions`, la inserta como `pendiente`.
    - Si hay una en `alta`, no cambia nada (el enlace se resuelve al leer).
    - Si está en `descartado`, no la reabre.
  - **XP:** si no es de local y es uno de los 3 primeros posts del día del autor en Caracas, llama a `award_community_xp(autor, 3, 'post', 'post:'||id, id, null)`.
  - **Misión:** si no es de local, llama a `grant_mission(autor, 'first_post')`.
  - **Notificación:** si `restaurant_id` no es nulo y el local tiene `owner_id`, inserta una notificación `post_mention` al dueño con `data = {kind:'post_mention', post_id, restaurant_id}`. Lo omite cuando el autor es ese dueño.
- `mission_xp` y `mission_title` ganan:
  - `first_post` → 20, "Tu primer post en Comunidad"
  - `brought_local` → 50, "Trajiste un local a El Point"
- `notifications_type_check` gana `post_like`, `post_reply` y `post_mention` (parte de la lista vigente en `20260921000000_payment_plans.sql`).
- `push_setting_key`, en su versión vigente de `20260911230000_subscription_reminders.sql`, gana:
  - `post_like` → `notifRanks`
  - `post_reply` → `notifReplies`
  - `post_mention` → `notifReviews`
- Trigger `post_replies` before insert (comensal):
  - Rechaza si el usuario está vetado.
  - Rechaza con `reply_rate_limited` si lleva más de 60 en 24 h.
  - Rechaza si el post no está `visible`.
- Trigger `post_replies` after insert:
  - Suma `reply_count`.
  - Si el autor de la respuesta no es el del post y la respuesta no es de local, otorga `award_community_xp(autor_post, 1, 'reply_received', 'reply:'||post||':'||replier, post, replier)`. La clave por persona hace que dé una sola vez.
  - Si el post es `recomiendame`, la respuesta tiene `restaurant_id` y no es de local, otorga `award_community_xp(replier, 2, 'recommendation', 'rec:'||reply_id, post, null)`, siempre que el replier lleve menos de 5 filas `recommendation` activas hoy.
  - Notifica `post_reply` al autor del post si es otra persona, con `data = {kind:'post', post_id}`.
- Trigger `post_replies` after delete:
  - Resta `reply_count`.
  - Revierte `rec:{id}`.
  - Revierte `reply:{post}:{author}` solo si ya no queda otra respuesta de esa persona en ese post.
- Notificación `post_like`, en el trigger de me gusta de la Tarea 3: se inserta solo si no existe ya una `post_like` sin leer para el mismo `post_id` y destinatario. Así se agrupan.

- [ ] **Paso 1: Escribir la prueba que falla `write.sql`**

Ejecutada como usuario `authenticated` simulado:
- `create_post_ok_con_categoria`: devuelve un uuid; `post_categories` tiene 1 fila; el XP sube 3; se concede `first_post` con +20, así que el XP total sube 23.
- `create_post_idempotent`: llamar dos veces con el mismo `p_client_id` devuelve el mismo id y hay 1 sola fila.
- `post_needs_tag`: sin local ni categorías da `post_needs_tag`.
- `cuarto_post_no_da_xp`: el post 4 del día no suma los +3.
- `once_posts_rate_limited`: el post 11 en 24 h da `post_rate_limited`.
- `comensal_no_usa_novedades`: da `invalid_topic`.
- `sugerencia_creada`: un post con `suggested_name` 'El Fogón' crea `local_suggestions('fogon')` en `pendiente`; uno con 'fogon' no crea otra fila.
- `sugerencia_descartada_no_reabre`: con `fogon` en `descartado`, un post nuevo deja el estado igual.
- `mencion_notifica_dueno`: un post con `restaurant_id` de un local con dueño crea 1 notificación `post_mention`.
- `respuesta_da_uno_por_persona`: B responde 2 veces y A sube 1 XP; `reply_count` queda en 2.
- `recomendacion_tope_5`: 6 respuestas de B con `restaurant_id` en posts `recomiendame` distintos dan 10 XP por recomendación, no 12.
- `sesenta_y_una_respuestas`: da `reply_rate_limited`.

- [ ] **Paso 2: Ejecutar `node scripts/sqltest.mjs supabase/tests/comunidad/write.sql`.** Esperado: FAIL, `create_post` no existe.
- [ ] **Paso 3: Escribir la migración.**
- [ ] **Paso 4: Ejecutar las pruebas `write.sql` y `xp.sql`.** Esperado: las dos PASS.
- [ ] **Paso 5: Commit** `feat(comunidad): publicar, responder, límites, misiones y avisos`.

### Tarea 5: Locales que publican y moderación

**Archivos:**
- Crear: `supabase/migrations/20261105010300_community_owner_moderation.sql`
- Crear: `supabase/tests/comunidad/owner_moderation.sql`

**Interfaces:**
- Consume: Tareas 2 a 4, `public.is_admin(uuid)` y el patrón `app.elpoint_privileged` de `20260902182818_review_moderation.sql`.
- En `create_post`, si `p_as_restaurant_id` no es nulo (se hace `create or replace` de la versión de la Tarea 4):
  - `owner_not_allowed`: el usuario no es `owner_id` del local.
  - `owner_posts_disabled`: el interruptor `app_settings.owner_posts_enabled` está apagado.
  - `owner_no_plan`: `not restaurant_has_plan(id)`.
  - `owner_banned`: `community_banned_at` no es nulo.
  - `owner_post_rate_limited`: ya hay 1 post de ese local en 24 h.
  - Fuerza `topic = 'novedades'` y `restaurant_id = p_as_restaurant_id` y anula `suggested_*`.
  - No da XP ni misión.
- Respuestas de local (trigger before insert de `post_replies` con `as_restaurant_id`):
  - Rechaza con `owner_not_allowed`, `owner_posts_disabled`, `owner_no_plan` u `owner_banned` en los mismos casos que `create_post`.
  - Rechaza con `owner_reply_not_mentioned` si `posts.restaurant_id <> as_restaurant_id`.
- Guarda de columnas: `guard_post_moderation_cols()` en `posts` y `post_replies` congela `moderation`, `moderated_at`, `like_count`, `reply_count`, `author_id` y `as_restaurant_id` salvo con `app.elpoint_privileged = on`. La única excepción es `moderation`/`moderated_at`, que el admin sí cambia.
- Autoocultación: `evaluate_post_moderation(p_post uuid, p_reply uuid)`, llamado por el trigger after insert de `post_reports`. Con 3 o más `reporter_id` distintos, pasa a `hidden` y notifica `moderation` al autor ("Tu post está en revisión"). El reporte del dueño del local etiquetado **no** tiene trato especial.
- Retirada (`moderation` pasa a `removed`, after update):
  - Si no es de local, suma un strike al autor (con ban a los 3, igual que `on_review_removed`) y llama a `revert_community_xp_for_post`. En una respuesta revierte `rec:` y `reply:`.
  - Si es de local, hace `community_removals + 1` y fija `community_banned_at = now()` al llegar a 3. No suma strike personal.
- `notify_admins` en el reporte: copia `20260907230240_notify_admins_on_report.sql` con `data.kind = 'post_report'`.

- [ ] **Paso 1: Escribir la prueba que falla `owner_moderation.sql`**

Pruebas:
- `owner_post_ok`: un dueño con plan publica; el post sale con `topic = 'novedades'` y `restaurant_id` igual a su local; su XP no cambia.
- `owner_post_rate_limited`: el segundo post en 24 h falla con ese código.
- `owner_post_requires_plan`: un local sin `founder_rank` y con `paid_until` vencido da `owner_no_plan`.
- `owner_post_banned`: con `community_banned_at` fijado, da `owner_banned`.
- `kill_switch`: con `owner_posts_enabled = false`, da `owner_posts_disabled`.
- `owner_reply_only_mentions`: responder como local en un post sin su local da `owner_reply_not_mentioned`.
- `tres_reportes_ocultan`: con 2 reportes sigue `visible`; con 3 pasa a `hidden`.
- `reporte_del_dueno_no_basta`: el dueño del local etiquetado reporta y el post sigue `visible`.
- `usuario_no_cambia_moderacion`: el autor hace `update posts set moderation = 'visible'` sobre su post oculto y queda `hidden`.
- `removed_strike_y_descuento`: el admin pasa el post a `removed`; el autor tiene `strikes + 1` y el XP del post se revierte.
- `tres_removidos_vetan_local`: 3 posts de local retirados fijan `community_banned_at`, y los `strikes` del dueño no cambian.

- [ ] **Paso 2: Ejecutar `node scripts/sqltest.mjs supabase/tests/comunidad/owner_moderation.sql`.** Esperado: FAIL.
- [ ] **Paso 3: Escribir la migración.**
- [ ] **Paso 4: Ejecutar todas las pruebas de `supabase/tests/comunidad/`.** Esperado: todas PASS.
- [ ] **Paso 5: Commit** `feat(comunidad): posts de locales con límites y moderación`.

### Tarea 6: Feed combinado `community_feed`

**Archivos:**
- Crear: `supabase/migrations/20261105010400_community_feed.sql`
- Crear: `supabase/tests/comunidad/feed.sql`

**Interfaces:**
- Produce `public.community_feed(p_topic text default null, p_category smallint default null, p_restaurant uuid default null, p_query text default null, p_before_at timestamptz default null, p_before_id uuid default null, p_limit int default 20) returns table(...)`. Es `stable`, `security definer` y tiene `grant` a `authenticated`.
- Columnas de salida (la app las tipa igual en la Tarea 8):
  - Identidad: `kind text` (`'post'` o `'review'`), `id uuid`, `created_at timestamptz`, `topic text` (`'resenas'` para reseñas).
  - Contenido: `body text`, `rating smallint` (solo reseñas).
  - Autor: `author_id uuid`, `author_name text`, `author_avatar text`, `author_level int`.
  - Como local: `as_restaurant_id uuid`, `as_restaurant_name text`, `as_restaurant_logo text`.
  - Local etiquetado: `restaurant_id uuid`, `restaurant_name text`, `restaurant_category text`, `restaurant_zone text`. Toma `posts.restaurant_id` o, si no hay, el `local_suggestions.restaurant_id` con `status = 'alta'` cuya clave coincide. La zona es `zone_label` o, si falta, `address`.
  - Sugerido: `suggested_name text`, `suggested_zone text`.
  - Extras: `category_ids smallint[]`, `photo_paths text[]` (ordenadas por `position`), `like_count int`, `reply_count int`, `viewer_liked boolean`.
- Reglas:
  - Solo `moderation = 'visible'` en las dos fuentes.
  - Las reseñas, solo de locales `approved` y activos.
  - Excluye autores que `auth.uid()` bloqueó (`user_blocks`).
  - Orden `(created_at desc, id desc)`; el cursor toma `(created_at, id) < (p_before_at, p_before_id)`.
  - Filtros:
    - `p_topic = 'resenas'` devuelve solo reseñas; otro tema devuelve solo posts de ese tema.
    - `p_category` filtra posts por `post_categories` y reseñas por las categorías de su local.
    - `p_restaurant` devuelve solo posts (no reseñas) etiquetados a ese local, directo o por sugerencia en `alta`.
    - `p_query` aplica `ilike` sobre `body` y el nombre del local.
  - Para reseñas: `like_count` es `helpful_count`, `viewer_liked` sale de `review_helpful`, `reply_count` es 0 y `photo_paths` sale de `review_photos`.

- [ ] **Paso 1: Escribir la prueba que falla `feed.sql`**

Pruebas:
- `feed_mezcla_y_ordena`: 2 posts y 1 reseña devuelven 3 filas ordenadas.
- `feed_cursor_sin_duplicados`: con `p_limit = 2`, la página 2 armada con el cursor de la última fila trae el elemento restante y ninguno repetido.
- `feed_oculta_no_visibles`: un post `hidden` no sale.
- `feed_hides_blocked_authors`: el viewer bloquea a A y los posts y reseñas de A no salen.
- `feed_filtra_tema_resenas`.
- `feed_por_local_incluye_sugerencia_alta`: un post con `suggested_name` 'Fogón', con `local_suggestions('fogon')` en `alta` y `restaurant_id` X, sale con `p_restaurant = X` y `restaurant_name` igual al nombre de X.
- `viewer_liked`: refleja el me gusta del viewer.

- [ ] **Paso 2: Ejecutar `node scripts/sqltest.mjs supabase/tests/comunidad/feed.sql`.** Esperado: FAIL.
- [ ] **Paso 3: Escribir la migración.** Al final, ejecuta un `explain` del caso sin filtros dentro de la prueba para confirmar que usa el índice de `posts` creado en la Tarea 2.
- [ ] **Paso 4: Ejecutar todas las pruebas de `supabase/tests/comunidad/`.** Esperado: todas PASS.
- [ ] **Paso 5: Commit** `feat(comunidad): feed combinado de posts y reseñas por cursor`.

### Tarea 7: Sugerencias de locales (alta, XP y misión)

**Archivos:**
- Crear: `supabase/migrations/20261105010500_local_suggestions_admin.sql`
- Crear: `supabase/tests/comunidad/suggestions.sql`

**Interfaces:**
- Produce `public.admin_local_suggestions() returns table(normalized_name text, display_name text, status text, restaurant_id uuid, post_count int, last_zone text, last_post_at timestamptz)`:
  - Solo para admin; si no lo es, `raise exception 'forbidden'`.
  - `display_name` es el `suggested_name` del post más reciente.
  - Agrupa los posts visibles por `suggested_key` y omite los que están en `descartado`.
- Produce `public.set_local_suggestion_status(p_name text, p_status text, p_restaurant uuid default null) returns void`:
  - Solo para admin.
  - Con `alta` exige `p_restaurant`.
  - La primera vez que pasa a `alta`, a quien sugirió primero (autor del post visible más antiguo con esa clave y sin `as_restaurant_id`):
    - Le da `award_community_xp(user, 25, 'suggestion_alta', 'alta:'||name, null, null)`.
    - Le concede `grant_mission(user, 'brought_local')`.
  - La clave única evita pagar dos veces si se alterna el estado.

- [ ] **Paso 1: Escribir la prueba que falla `suggestions.sql`**

Pruebas:
- `suggestion_grouping`: 'Restaurante El Fogón', 'el fogon' y 'FOGÓN' dan 1 fila con `post_count = 3`.
- `alta_premia_primero`: el primer sugeridor gana +25 y +50 (misión) y el segundo gana 0.
- `alta_dos_veces_no_repite`: pasar a `alta`, luego a `contactado` y otra vez a `alta` deja el XP igual.
- `no_admin_forbidden`.

- [ ] **Paso 2: Ejecutar `node scripts/sqltest.mjs supabase/tests/comunidad/suggestions.sql`.** Esperado: FAIL.
- [ ] **Paso 3: Escribir la migración.**
- [ ] **Paso 4: Ejecutar todas las pruebas de `supabase/tests/comunidad/`.** Esperado: todas PASS.
- [ ] **Paso 5: Commit** `feat(comunidad): sugerencias de locales con alta premiada`.
- [ ] **Paso 6: Cierre de fase.**
  1. Pedir al usuario permiso para aplicar las migraciones con `npx supabase db push`.
  2. Con su sí, regenerar `lib/database.types.ts` con `npx supabase gen types typescript --linked > lib/database.types.ts` y confirmar que `npx tsc --noEmit` pasa.
  3. Hacer commit de los tipos.

---

## Fase 2: datos en la app

### Tarea 8: Módulo de dominio y consultas de Comunidad

**Archivos:**
- Crear: `lib/community/topics.ts`. Puro, sin RN: `TOPICS`, `CUSTOMER_TOPICS`, `topicLabel(key)` y `errorMessage(code)`.
- Crear: `lib/community/topics.test.ts`
- Crear: `lib/queries/community.ts`
- Modificar: `lib/storage.ts`. Agrega `uploadPostPhoto(postId: string, position: number, uri: string): Promise<string>` y `postPhotoUrl(path: string): string`, iguales a sus pares de reseñas y con el bucket `post-photos`.

**Interfaces:**
- Produce `type TopicKey = 'recomiendame'|'locales_nuevos'|'recetas'|'antojos'|'novedades'|'resenas'` y `TOPICS: {key: TopicKey; label: string}[]`, en el orden del spec.
- Produce `errorMessage(code: string): string`, que mapea cada código de las Tareas 4 y 5 a un texto en es-VE. Ejemplos:
  - `post_rate_limited` → "Llegaste al máximo de 10 posts por hoy. Vuelve mañana."
  - `owner_no_plan` → "Publicar como local es parte del plan activo de tu local."
  - Código desconocido → "No pudimos publicar. Inténtalo de nuevo."
- Produce `type FeedItem`, con exactamente las columnas de `community_feed` de la Tarea 6 en camelCase.
- Produce estos hooks en `lib/queries/community.ts`:
  - `useCommunityFeed(filters: {topic?: TopicKey; categoryId?: number; restaurantId?: string; query?: string})`
    - `useInfiniteQuery` con clave `['community-feed', filters]`.
    - Páginas de 20; el cursor es `{at, id}` del último elemento.
  - `useCreatePost()`
    - Recibe `{clientId, topic, body, restaurantId?, suggestedName?, suggestedZone?, categoryIds, asRestaurantId?, photos: string[]}`.
    - Llama a `create_post`, sube las fotos con `uploadPostPhoto` e inserta `post_photos`.
    - Optimista: antepone el post a la primera página de `['community-feed', {}]` y lo quita si falla.
  - `usePost(postId)`
  - `usePostReplies(postId)`
  - `useCreateReply(postId)`: optimista.
  - `useToggleLike()`: optimista, con el mismo patrón `mutationKey`/`scope`/`isMutating` que `useToggleFavorite` en `lib/queries/feed.ts`. Para filas `kind === 'review'` delega en la tabla `review_helpful`.
  - `useDeletePost()`, `useDeleteReply()`
  - `useReportPost()`: recibe `{postId?, replyId?, reason, note}`.
  - `useAppSettings()`: lee `app_settings`.
- Todas usan `getSessionUser()` de `lib/supabase.ts` y nunca `supabase.auth.getUser()`.

- [ ] **Paso 1: Escribir la prueba que falla `topics.test.ts`**

Pruebas:
- `CUSTOMER_TOPICS` no contiene `novedades` ni `resenas`.
- `topicLabel('recomiendame') === 'Recomiéndame'`.
- `errorMessage('post_rate_limited')` incluye "10".
- `errorMessage('xyz') === 'No pudimos publicar. Inténtalo de nuevo.'`.

- [ ] **Paso 2: Ejecutar `node --test lib/community/topics.test.ts`.** Esperado: FAIL.
- [ ] **Paso 3: Implementar `topics.ts`, las consultas y el storage.**
- [ ] **Paso 4: Ejecutar `node --test lib/community/topics.test.ts`, `npx tsc --noEmit` y `npm run lint`.** Esperado: todo PASS y limpio.
- [ ] **Paso 5: Commit** `feat(comunidad): consultas y dominio en la app`.

---

## Fase 3: pantallas (cada una con maqueta aprobada antes de programar)

Cada tarea de esta fase sigue el mismo ciclo, que sustituye el ciclo de pruebas porque no hay un runner de UI:

1. **Maqueta.** Maqueta HTML de la pantalla en claro y oscuro con la skill `impeccable`, enviada al usuario con `SendUserFile`. El usuario la aprueba.
2. **Implementación.** Se programa la pantalla.
3. **Chequeos.** `npx tsc --noEmit` y `npm run lint` limpios.
4. **Prueba en el iPad.** Se prueba con el development build y Metro, recorriendo la **lista de comprobación** de la tarea. Cada punto se marca solo cuando el usuario confirma que pasó en su iPad o cuando se verificó por logs de Metro.
5. **Revisión de diseño.** Con `impeccable` y `design-motion-principles`.
6. **Commit.**

### Tarea 9: Barra de navegación de 5 pestañas y feed

**Archivos:**
- Crear: `app/(customer)/community.tsx`
- Crear: `components/community/FeedRow.tsx`, la fila de post o reseña (avatar, nombre, hora, tema, texto, píldora del local, fotos, acciones).
- Crear: `components/community/PhotoCarousel.tsx`, el carrusel con puntos y un visor a pantalla completa con gesto para cerrar.
- Crear: `components/community/TopicFilters.tsx`, las dos filas de chips.
- Crear: `components/community/FeedSkeleton.tsx`
- Modificar: `app/(customer)/_layout.tsx`. Orden de pestañas: `index`, `map`, `community`, `search` y `profile`, con títulos Inicio, Mapa, Comunidad, Explorar y Perfil.
- Modificar: `components/ui/FloatingTabBar.tsx`. Rediseño para 5 pestañas según la maqueta aprobada.
- Modificar: `components/ui/NotificationsSheet.tsx`, en `notifTarget`:
  - `kind === 'post'` lleva a `/community/[id]`.
  - `kind === 'post_mention'` lleva a `/community/[id]`.
  - `kind === 'post_report'` lleva a `/admin/community`, si existe la ruta en la app.
- Modificar: `lib/queries/blocks.ts`. `useBlockUser` también invalida `['community-feed']`.

**Lista de comprobación en el iPad:**
- La cabecera es la de Inicio (`ScreenHeader` con `AppLogo`, buscar y `NotificationBell`).
- Las reseñas salen en el feed con estrellas.
- Al dar me gusta, el número cambia al instante y vibra.
- Con el avión activado, el me gusta se revierte y sale un aviso.
- El scroll infinito carga antes de llegar al final y el refresco funciona al tirar hacia abajo.
- Los filtros vacíos muestran un mensaje que invita a publicar.
- Al bloquear a alguien desde una fila, sus posts desaparecen.
- Se ve bien en modo claro y en oscuro.
- Las animaciones respetan "reducir movimiento".

**Commit:** `feat(comunidad): pestaña Comunidad con feed y barra de 5 pestañas`.

### Tarea 10: Publicar

**Archivos:**
- Crear: `app/community/new.tsx`, un modal apilado.
- Crear: `components/community/RestaurantPickerSheet.tsx`, una hoja con buscador de locales de la app (reutiliza `lib/queries/search.ts`) y la opción "No está en El Point, escríbelo".
- Crear: `components/community/CategoryPickerSheet.tsx`, máximo 2.
- Crear: `lib/community/draft.ts`: `loadDraft()`, `saveDraft(d)` y `clearDraft()` sobre AsyncStorage con la clave `community-draft`.
- Modificar: `app/(customer)/community.tsx`, para el botón flotante "Publicar".

Puntos fijos:
- `clientId` se genera con `expo-crypto` `randomUUID()` al abrir la pantalla y se mantiene en los reintentos.
- El botón se desactiva hasta que haya texto y además local o categoría.
- Los errores se muestran con `errorMessage(code)`.

**Lista de comprobación en el iPad:**
- Se publica en pocos toques.
- El teclado no tapa el texto.
- Cada foto muestra su progreso de subida.
- Si sales y vuelves, el borrador sigue ahí.
- Un doble toque en Publicar crea un solo post.
- Con el post número 11 del día sale el mensaje del límite.
- El post propio aparece arriba al instante.

**Commit:** `feat(comunidad): pantalla para publicar con local, categorías y fotos`.

### Tarea 11: Detalle del post y respuestas

**Archivos:**
- Crear: `app/community/[id].tsx`
- Crear: `components/community/ReplyRow.tsx`, el hilo con línea vertical.
- Crear: `components/community/ReplyComposer.tsx`. En posts `recomiendame` deja etiquetar un local de la app con `RestaurantPickerSheet`.

Puntos fijos:
- Reportar usa `ReportSheet` con los mismos motivos que las reseñas.
- Borrar el propio pide confirmación.
- Bloquear al autor usa el flujo de `lib/queries/blocks.ts`.

**Lista de comprobación en el iPad:**
- La respuesta aparece al instante.
- Reportar funciona y no deja reportar dos veces.
- Al borrar un post propio, sale del feed.
- Si el post fue ocultado, se ve un estado "Este post no está disponible".

**Commit:** `feat(comunidad): detalle del post con respuestas en hilo`.

### Tarea 12: Perfil del local y acceso del dueño

**Archivos:**
- Modificar: `app/restaurant/[id].tsx`. Nueva sección "Lo que dicen en Comunidad" con `useCommunityFeed({restaurantId})`, 3 filas y "Ver todo". Visible en todos los locales, tengan plan o no.
- Crear: `app/community/mentions.tsx`. "Te mencionan" para el dueño, con el feed filtrado por su local.
- Modificar: `app/(owner)/index.tsx`. Entrada "Comunidad", que abre el feed como pantalla apilada en `app/community/feed.tsx` y reutiliza el componente de la pestaña.
- Modificar: `app/(owner)/local.tsx`. Entrada "Te mencionan" y botón "Publicar novedad". Este último abre `app/community/new.tsx?asRestaurant=<id>` con el tema fijo.

Puntos fijos:
- Cuando el usuario es dueño, todo lo que hace en Comunidad envía `asRestaurantId`.
- Sin plan, el botón "Publicar novedad" no se muestra y en su lugar sale el texto "Publicar como local es parte del plan activo", sin precio.
- Con `useAppSettings().owner_posts_enabled === false`, el botón se oculta.

**Lista de comprobación en el iPad, con la cuenta de dueño:**
- Publicar una novedad funciona.
- Una segunda novedad en 24 h muestra el mensaje.
- Llega la notificación `post_mention` y abre el post.
- El dueño solo puede responder en los posts que mencionan su local.

**Commit:** `feat(comunidad): sección en el perfil del local y Comunidad para dueños`.

### Tarea 13: Misiones nuevas en la app

**Archivos:**
- Modificar: `lib/queries/missions.ts`. Agrega `first_post` y `brought_local` al tipo y a la lista, con los mismos títulos y XP que en SQL (20 y 50).

**Prueba en el iPad:** tras el primer post, en Perfil aparece la misión cumplida.

**Commit:** `feat(misiones): primer post y local traído`.

---

## Fase 4: panel admin

### Tarea 14: Posts reportados, locales sugeridos y ajustes

**Archivos:**
- Crear: `admin-web/src/lib/queries/community.ts`
- Crear: `admin-web/src/pages/ReportedPosts.tsx`
- Crear: `admin-web/src/pages/LocalSuggestions.tsx`
- Crear: `admin-web/src/pages/Settings.tsx`
- Modificar: `admin-web/src/App.tsx`, para las rutas `comunidad`, `sugerencias` y `ajustes`.
- Modificar: `admin-web/src/components/Layout.tsx`, para el menú.
- Modificar: `admin-web/src/components/CommandPalette.tsx`, para agregar las 3 páginas.

**Interfaces:**
- `ReportedPosts` copia el patrón de `ReportedReviews.tsx` y `admin-web/src/lib/queries/moderation.ts`.
  - Lista posts y respuestas en `hidden` o con reportes.
  - Las acciones "Dejar visible" y "Retirar" hacen `update moderation` y borran sus `post_reports`.
- `LocalSuggestions` usa `admin_local_suggestions()`.
  - Las acciones "Contactado", "Dar de alta (elegir local)" y "Descartar" llaman a `set_local_suggestion_status`.
  - El selector de local reutiliza la búsqueda de `Locales.tsx`.
- `Settings`: un interruptor `owner_posts_enabled` (update de `app_settings`). Además, la lista de locales con `community_banned_at`, con un botón "Devolver permiso" que pone `community_banned_at = null` y `community_removals = 0` mediante una RPC admin `admin_restore_community(p_restaurant uuid)`. Esa RPC se agrega en esta tarea como migración `20261105020000_admin_restore_community.sql`, con la prueba `supabase/tests/comunidad/admin_restore.sql` (`no_admin_forbidden`, `restaura`).

- [ ] **Paso 1: Escribir la prueba que falla `admin_restore.sql`.** Ejecutar `node scripts/sqltest.mjs supabase/tests/comunidad/admin_restore.sql`. Esperado: FAIL.
- [ ] **Paso 2: Escribir la migración.** Ejecutar la prueba de nuevo. Esperado: PASS.
- [ ] **Paso 3: Implementar las páginas.** Desde `admin-web/` ejecutar `npm run build`. Esperado: compila sin errores.
- [ ] **Paso 4: Revisar con datos de prueba en el modo mock.**
  - Con `vite.mock.config.ts`, agrega datos simulados de Comunidad en `admin-web/src/mock/`.
  - Revisa las 3 páginas en el navegador integrado: abrir, filtrar y que los botones llamen lo esperado.
- [ ] **Paso 5: Commit** `feat(admin): posts reportados, locales sugeridos y ajustes de Comunidad`. El deploy del panel ocurre al hacer push; no hacer push sin pedirlo.

---

## Orden de entrega y cierre

1. **Fase 0** (Tarea 1). Puede aplicarse con `db push` y salir en el próximo build sola.
2. **Fase 1** (Tareas 2 a 7). Termina con `db push` autorizado por el usuario y los tipos regenerados.
3. **Fases 2 y 3** (Tareas 8 a 13), probadas en el iPad.
4. **Fase 4** (Tarea 14).
5. **Cierre:**
   - Revisión de diseño final de todas las pantallas.
   - `superpowers:requesting-code-review` sobre la rama.
   - Nuevo build iOS de producción solo cuando el usuario lo pida y la versión en revisión ya esté aprobada.
