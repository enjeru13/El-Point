# Comunidad 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add threaded replies with likes and @mentions, a public user profile, polls, sharing posts outside the app (web page), new action icons, and a notification overhaul to Comunidad. Ships as 1.2.0.

**Architecture:** Four migrations carry the data and the rules (threads, mentions and profile, polls, notifications and public post), each with an SQL test. Pure TS modules (`lib/community/threads.ts`, `lib/community/mentions.ts`, `lib/notifRoute.ts`) hold the logic the UI needs and are tested with `node --test`. The UI tasks wire those into the existing Comunidad screens. The web page `landing/p/` reads the post through an anon RPC.

**Tech Stack:** Supabase (Postgres, RLS, SECURITY DEFINER RPCs, pg_cron, pg_net push), Expo SDK 54 + expo-router, React Query, lucide icons through `components/ui/Icon.tsx`, node:test.

**Spec:** `docs/superpowers/specs/2026-11-09-comunidad-conversaciones-design.md`

## Global Constraints

- Read the Expo v54 docs before using an Expo API.
- Copy in neutral Venezuelan Spanish using "tú". Interface icons always come from `Icon`, never emojis.
- Start from the current function definitions: `20261105030000_review_fixes.sql` and `20261105040000_community_polish.sql` override earlier versions.
- Public functions are SECURITY DEFINER with `set search_path = ''` (or `public, extensions`) and an explicit `revoke` / `grant`. New columns on tables with column grants need their own `grant select`.
- SQL tests:
  1. `node scripts/sqltest.mjs supabase/tests/<t>.sql --from <migration>`
  2. `npx supabase db query --linked --yes -f supabase/tests/.out/run.sql`
  3. Apply with `echo y | npx supabase db push`.
  4. Regenerate types with `npx supabase gen types typescript --linked > lib/database.types.ts`.
  - Test coordinates: 8.50, -71.50.
- Pure TS tests: `node --test lib/**/*.test.ts lib/*.test.ts`.
- No EAS Update to `production` without the owner asking. The version goes to `1.2.0`.
- Community XP always goes through `award_community_xp` (daily cap) with a unique `source_key`.

## Review Focus

1. A reply to a reply whose parent was deleted by its author keeps rendering, under "Respuesta eliminada". Test `hilo_padre_eliminado` (Task 1) and `arbol_con_padre_borrado` (Task 5).
2. A mention of a blocked user, or a 6th mention, creates no notification. Test `mencion_bloqueada_y_tope` (Task 2).
3. Voting twice changes the vote instead of adding one, and voting on a closed poll fails. Test `voto_cambia_y_cerrada` (Task 3).
4. `get_public_post` never returns a hidden post, nor the author's id or email. Test `post_publico_oculto` (Task 4).
5. A user who never touched the promo setting gets no promo push. Test `promo_por_defecto_apagada` (Task 4).

---

### Task 1: DB — threaded replies, reply likes, deleting your own reply

**Files:**
- Create: `supabase/migrations/20261111000000_community_threads.sql`
- Create: `supabase/tests/community_threads.sql`

**Interfaces — Produces:**
- `post_replies.parent_reply_id uuid null`, a reference to `post_replies(id)` with `on delete set null`. A check makes the parent belong to the same post (enforced in `before_post_reply_insert`).
- `post_replies.like_count int not null default 0`. Grant select on both columns.
- Table `post_reply_likes(reply_id, user_id, created_at, primary key(reply_id, user_id))`:
  - RLS: select for everyone; insert and delete only your own like.
  - Triggers keep `like_count`.
  - Like XP for the reply author: 1 XP, `source_key 'rlike:{reply}:{user}'`, reverted when the like is deleted.
  - Notification `reply_like` to the author (`data {kind:'post', post_id, reply_id}`), skipped while an unread one exists for the same reply, and never for yourself.
- `after_post_reply_insert` (latest version): when `parent_reply_id` is set and the parent's author is neither the replier nor the post author, insert `reply_reply` "@{user} respondió tu comentario", `data {kind:'post', post_id, reply_id}`.
- RPC `delete_my_reply(p_reply_id uuid) returns void`:
  - Only the author can call it.
  - With child replies: `moderation='removed'`, `body='[eliminada]'`, `moderated_at=now()`.
  - Without children: real delete.
  - Revoke the direct `delete` grant on `post_replies` from authenticated.
- Add `'reply_like','reply_reply'` to the `notifications.type` check (keep every existing value).

- [ ] **Step 1: Write `supabase/tests/community_threads.sql`** using the `pg_temp.new_user` / `act_as` helpers. Tests:
  - `hilo_padre_otro_post`: a reply whose parent belongs to another post fails.
  - `aviso_respuesta_a_respuesta`: B replies to A's reply on C's post, so A gets exactly 1 `reply_reply` and C still gets `post_reply`.
  - `like_respuesta_cuenta_y_xp`: a like raises `like_count` to 1 and gives the author XP. Unliking takes it back to 0 and reverts the XP.
  - `like_respuesta_sin_spam`: two likes from different users while the first notification is unread leave 1 `reply_like` notification.
  - `hilo_padre_eliminado`: the author calls `delete_my_reply` on a reply that has a child. The row stays with `moderation='removed'` and the child still points to it. On a reply without children, the row disappears.
  - `borrar_ajena_falla`: `delete_my_reply` on someone else's reply raises an error.
- [ ] **Step 2:** Run it. Expected: FAIL (column `parent_reply_id` does not exist).
- [ ] **Step 3:** Write the migration.
- [ ] **Step 4:** Run it. Expected: TODO OK.
- [ ] **Step 5:** `db push` and regenerate types. Commit `feat(comunidad): respuestas en hilo, me gusta en respuestas y borrar la propia`.

### Task 2: DB — mentions and public profile

**Files:**
- Create: `supabase/migrations/20261111010000_community_mentions_profile.sql`
- Create: `supabase/tests/community_mentions.sql`

**Interfaces — Produces:**
- Table `post_mentions(id, post_id, reply_id null, user_id, created_at)` with a unique `(post_id, coalesce(reply_id), user_id)` index. RLS select for everyone.
- `extract_mentions(p_body text) returns text[]`: the distinct, lowercased usernames matching `@([A-Za-z0-9_.]{3,30})`, at most 5, in order of appearance.
- Triggers after insert on `posts` and `post_replies`:
  - resolve usernames against `profiles.username` (case-insensitive);
  - skip the author, users who blocked the author or were blocked by them (existing block table), and users who already got `post_reply` or `reply_reply` from the same insert;
  - insert into `post_mentions` and a notification `user_mention` "@{autor} te mencionó", `data {kind:'post', post_id, reply_id}`.
- Add `'user_mention'` to the type check.
- RPC `get_public_profile(p_user_id uuid) returns jsonb`, granted to authenticated:
  - returns `{id, username, full_name, avatar_url, bio, xp, level, rank_count, missions_done}`;
  - returns null when there is a block in either direction or the user is banned from Comunidad;
  - never returns email or settings.
- RPC `search_mention_users(p_query text, p_post_id uuid default null) returns table(id, username, avatar_url)`:
  - first the participants of `p_post_id`, then prefix matches on username;
  - limit 8, blocked users excluded.

- [ ] **Step 1: Write the tests:**
  - `extrae_menciones`: `extract_mentions('hola @Ana y @ana, @b @carlos_1')` returns `{ana,carlos_1}`. The 2-letter `@b` is ignored.
  - `mencion_avisa`: a post with "@{username}" creates 1 `user_mention` for that user.
  - `mencion_bloqueada_y_tope`:
    - mentioning someone who blocked you creates nothing;
    - a text with 6 valid mentions creates 5.
  - `mencion_sin_doble_aviso`: a reply to A's reply that also mentions @A gives A only `reply_reply`.
  - `perfil_publico`:
    - `get_public_profile` returns `username` and has no `email` key;
    - with a block it returns null.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Migration.
- [ ] **Step 4:** Run. Expected: OK.
- [ ] **Step 5:** Push, regenerate types. Commit `feat(comunidad): menciones y perfil público`.

### Task 3: DB — polls

**Files:**
- Create: `supabase/migrations/20261111020000_community_polls.sql`
- Create: `supabase/tests/community_polls.sql`

**Interfaces — Produces:**
- Table `post_polls(post_id pk references posts on delete cascade, closes_at timestamptz not null, ended_notified boolean default false)`.
- Table `post_poll_options(id uuid pk, post_id, position smallint, label text null check(length 1..60), restaurant_id uuid null)`, with a check that exactly one of label and restaurant_id is set.
- Table `post_poll_votes(post_id, user_id, option_id, created_at, primary key(post_id, user_id))`.
- RLS: select for everyone on polls and options. On votes, each user selects only their own row; totals come from the RPC.
- RPC `create_poll(p_post_id uuid, p_days int, p_options jsonb) returns void`:
  - only the post's author, once per post;
  - `p_days in (1,3,7)`;
  - 2 to 4 options of the form `{label}` or `{restaurant_id}`, where the restaurant must pass `community_taggable_restaurant`.
- RPC `vote_poll(p_post_id uuid, p_option_id uuid) returns jsonb`:
  - upsert of the vote;
  - error `poll_closed` after `closes_at`;
  - the first vote awards 2 XP with `source_key 'vote:{post}:{user}'`;
  - returns `poll_state`.
- RPC `poll_state(p_post_id uuid) returns jsonb` `{closes_at, closed, total, my_option, options:[{id, label, restaurant:{id,name}|null, votes}]}`. When the caller has not voted and the poll is open, `votes` is null.
- `community_feed` and the post detail query include `poll` (the `poll_state` json, or null) per post. Update the latest `community_feed` definition.
- pg_cron job `close-polls` every 15 minutes (`*/15 * * * *`):
  - for polls with `closes_at <= now()` and `ended_notified = false`, insert `poll_ended` to the author with "Tu encuesta terminó: ganó {opción} con {pct}%" (on a tie, the first by position), `data {kind:'post', post_id}`;
  - then set `ended_notified = true`.
- Add `'poll_ended'` to the type check.

- [ ] **Step 1: Write the tests:**
  - `crear_encuesta_valida`: 3 options (2 labels and 1 restaurant), then `poll_state.options` has length 3.
  - `encuesta_reglas`: 1 option fails; 5 fail; `p_days=2` fails; someone other than the author fails.
  - `voto_cambia_y_cerrada`:
    - a vote and then a different vote give `total=1` with `my_option` set to the second;
    - XP is awarded once;
    - after updating `closes_at` to the past, a vote raises `poll_closed`.
  - `resultados_ocultos`: a non-voter on an open poll gets `votes` null on every option.
  - `cierre_avisa`: with `closes_at` in the past, running the close function directly creates 1 `poll_ended` whose title contains the winning label and "%". A second run creates none.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Migration. The close logic lives in `close_due_polls()`, which the cron job calls.
- [ ] **Step 4:** Run. Expected: OK.
- [ ] **Step 5:** Push, regenerate types. Commit `feat(comunidad): encuestas`.

### Task 4: DB — notification settings, new notices, public post

**Files:**
- Create: `supabase/migrations/20261111030000_notifications_community.sql`
- Create: `supabase/tests/notifications_community.sql`

**Interfaces — Produces:**
- `push_setting_key`:
  - `post_like`, `post_reply`, `reply_like`, `reply_reply`, `user_mention` and `poll_ended` go to `notifCommunity`;
  - `mission` and `streak` go to `notifAchievements`;
  - the rest stay as they are.
- `push_setting_default(p_key text) returns text`: `'false'` for `notifPromos`, otherwise `'true'`. The push trigger uses `coalesce(v_settings ->> v_key, public.push_setting_default(v_key))`.
- Data migration: for each profile whose `settings ->> 'notifReplies' = 'false'`, set `settings.notifCommunity = false`.
- New notices:
  - `on_review_removed` notifies the author: `type 'moderation'`, title "Retiramos tu reseña", `data {kind:'review_removed', restaurant_id}`.
  - `set_local_suggestion_status`, on approval, notifies the suggester: `type 'mission'`, title "Aprobamos el local que sugeriste", `data {kind:'suggestion_approved', restaurant_id}`.
- RPC `get_public_post(p_post_id uuid) returns jsonb`, granted to anon and authenticated.
  - Only returns a post when it is `moderation='visible'` and the author is not community-banned.
  - Fields:
    - `{topic, body, created_at, like_count, reply_count}`;
    - `author:{username, level, rank_label, avatar_url}`;
    - `restaurant:{id,name}|null`, `suggested_name`;
    - `photos:[url]`;
    - `poll` (with votes visible);
    - `replies:[{author:{username,avatar_url}, body, created_at}]` (the first 2 visible root replies).
  - Never returns ids of users or email. Anything else returns null.

- [ ] **Step 1: Write the tests:**
  - `promo_por_defecto_apagada`: `push_setting_default('notifPromos')` is `'false'` and `push_setting_default('notifRanks')` is `'true'`.
  - `comunidad_mapeo`: `push_setting_key('reply_like')` is `'notifCommunity'` and `push_setting_key('mission')` is `'notifAchievements'`.
  - `migra_ajuste`: a profile with `notifReplies=false` ends with `notifCommunity=false`. Run the migration's update statement inside the test.
  - `post_publico_oculto`:
    - a visible post returns `body` and has no `author_id` key, and no key at any depth contains "email";
    - after `moderation='hidden'` it returns null.
  - `resena_retirada_avisa`: removing a review creates `kind='review_removed'` for its author.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Migration.
- [ ] **Step 4:** Run. Expected: OK.
- [ ] **Step 5:** Push, regenerate types. Commit `feat(avisos): ajuste Comunidad, promos apagadas por defecto, avisos nuevos y post público`.

### Task 5: Pure TS — thread tree, mention text, notification route

**Files:**
- Create: `lib/community/threads.ts`, `lib/community/threads.test.ts`
- Create: `lib/community/mentions.ts`, `lib/community/mentions.test.ts`
- Create: `lib/notifRoute.ts`, `lib/notifRoute.test.ts`

**Interfaces — Produces:**
- `type ThreadReply = { id: string; parentId: string | null; createdAt: string; removed: boolean }`
- `buildThreads<T extends ThreadReply>(replies: T[]): { root: T; children: (T & { replyingTo: string | null })[] }[]`
  - roots ordered by `createdAt`;
  - each child goes under the root of its chain, ordered by `createdAt`;
  - `replyingTo` is the id of the direct parent when that parent is not the root, otherwise null;
  - a child whose parent is missing (`parentId` not found) becomes a root;
  - removed roots that have no children are dropped.
- `mentionSegments(body: string): { text: string; username: string | null }[]`: splits the text into plain and `@username` parts with the same regex as Task 2.
- `activeMentionQuery(text: string, caret: number): string | null`: the partial `@query` right before the caret, or null.
- `notifRoute(type: string, data: Record<string, unknown>): string | null`, an expo-router path:
  - `post` kinds and `post_mention` go to `/community/{post_id}`;
  - `subscription` goes to `/subscription`;
  - `claim_approved` goes to `/(owner)`;
  - `community_removed` goes to `/(customer)/community`;
  - `review_removed`, `suggestion_approved` and a restaurant id go to `/restaurant/{restaurant_id}`;
  - `levelup`, `mission` and `streak` without a restaurant go to `/(customer)/profile`;
  - anything else returns null.

- [ ] **Step 1: Write the tests:**
  - `arbol_basico`: roots r1 and r2, with c1 replying to r1 and c2 replying to c1. Result: 2 roots; r1 has children `[c1, c2]`, with `c2.replyingTo = 'c1'` and `c1.replyingTo = null`.
  - `arbol_con_padre_borrado`: when c1's parent is not in the list, c1 becomes a root.
  - `raiz_eliminada_sin_hijos`: a removed root with no children is dropped; a removed root with children stays.
  - `segmentos_mencion`: `mentionSegments('hola @ana!')` deep-equals `[{text:'hola ',username:null},{text:'@ana',username:'ana'},{text:'!',username:null}]`.
  - `consulta_activa`: `activeMentionQuery('hey @an', 7)` is `'an'`; `activeMentionQuery('mail a@b', 8)` is `null`.
  - `rutas_aviso`:
    - `notifRoute('post_reply',{kind:'post',post_id:'p'})` is `'/community/p'`;
    - `notifRoute('sub_expiring',{kind:'subscription'})` is `'/subscription'`;
    - `notifRoute('moderation',{kind:'claim_approved',restaurant_id:'r'})` is `'/(owner)'`.
- [ ] **Step 2:** `node --test lib/community/*.test.ts lib/notifRoute.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the three modules. They are pure and have no React Native imports.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(comunidad): lógica pura de hilos, menciones y rutas de avisos`.

### Task 6: App — threads, reply likes, new icons

**Files:**
- Modify:
  - `lib/queries/community.ts`:
    - `Reply` gains `parent_reply_id`, `like_count`, `liked_by_me`, `removed`;
    - `useCreateReply` takes `parentReplyId`;
    - new `useToggleReplyLike(postId)`;
    - `useDeleteReply` calls `delete_my_reply`.
  - `components/community/ReplyRow.tsx`: heart and bubble actions, "Respondiendo a @x", "Autor" and "Local" labels, "Respuesta eliminada".
  - `app/community/[id].tsx`: render `buildThreads`, indent level 1 with a vertical line, "Ver N respuestas más" after 2, and the composer state "Respondiendo a @x" with a cancel action.
  - `components/community/FeedRow.tsx` and `[id].tsx`: the icon row heart / `message-circle` / `send` at the same size (20) and stroke, with the count beside each one.
  - `components/ui/Icon.tsx`: add `message-circle` and `send` from lucide if missing.

- [ ] **Step 1:** Implement, using the `buildThreads` interface from Task 5.
- [ ] **Step 2:** `npx tsc --noEmit` and `npx expo lint` show no errors.
- [ ] **Step 3:** Commit `feat(comunidad): hilos con me gusta e íconos nuevos`.

### Task 7: App — mentions and public profile

**Files:**
- Create: `components/community/MentionText.tsx` (renders `mentionSegments`; a mention is pressable and goes to `/user/{id}` after resolving the username via `search_mention_users`, or uses the profile id when it is already known).
- Create: `components/community/MentionSuggestions.tsx` (the list above the input while `activeMentionQuery` is not null; picking an item inserts `@username `).
- Create: `app/user/[id].tsx`. It reuses the pieces of `app/(customer)/profile.tsx`, read-only, as in spec §3b:
  - "Comunidad" tab with `FeedRow` over that author's posts (`community_feed` with an author filter, or a direct query);
  - "Ranks" tab with their visible reviews;
  - ••• with "Bloquear";
  - redirect to the Perfil tab when the id is your own.
- Modify: the composer in `app/community/new.tsx` and the reply input in `[id].tsx` use `MentionSuggestions`. `FeedRow`, `ReplyRow` and the detail render bodies with `MentionText`. Avatars and usernames open `/user/{author_id}`.
- Regenerate typed routes: `EXPO_ROUTER_APP_ROOT="$PWD/app" node -e "require('expo-router/build/typed-routes').regenerateDeclarations('.expo/types')"`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** tsc and lint clean.
- [ ] **Step 3:** Commit `feat(comunidad): menciones y perfil público`.

### Task 8: App — polls

**Files:**
- Create: `components/community/PollEditor.tsx` (2 to 4 options, each "Texto" or "Local" using the existing `RestaurantPickerSheet`; duration chips 1, 3 or 7 días, default 1).
- Create: `components/community/PollCard.tsx`:
  - options as buttons;
  - after voting or once closed, bars with % and "N votos · Cierra en X" or "Encuesta cerrada · ganó X";
  - a restaurant option shows the name and opens the restaurant.
- Modify:
  - `app/community/new.tsx`: "Encuesta" button in the toolbar; after `create_post` succeeds, call `create_poll`.
  - `lib/queries/community.ts`: `FeedItem.poll`, `useVotePoll(postId)`, optimistic.
  - `FeedRow` and the detail render `PollCard`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** tsc and lint clean.
- [ ] **Step 3:** Commit `feat(comunidad): encuestas en la app`.

### Task 9: Share a post and the web page `p/`

**Files:**
- Modify: `FeedRow` and the detail. The `send` button calls `Share.share` with ``"${snippet120}" — @${username} en Comunidad de El Point\nhttps://elpoint-app.netlify.app/p?id=${id}``.
- Create: `landing/p/index.html`, styled like `landing/l/index.html`:
  - reads `?id`, validates it as a UUID, tries `elpoint://community/{id}`;
  - fetches `POST {SUPABASE_URL}/rest/v1/rpc/get_public_post` with the anon key (the same values as `.env` `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY`);
  - renders spec §5;
  - "Esta publicación ya no está disponible" on null;
  - on Android, "Muy pronto en Android" instead of the App Store badge.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `preview_start landing`. `/p/?id=<a real visible post id>` shows the body and photos, and `/p/?id=x` shows the unavailable text.
- [ ] **Step 3:** Commit `feat(comunidad): compartir publicaciones con página web`.

### Task 10: App — notifications

**Files:**
- Modify:
  - `lib/queries/notifications.ts`: add `mission`, `streak`, `reply_like`, `reply_reply`, `user_mention` and `poll_ended` to `AppNotification`, and update `TYPE_SETTING` to match Task 4.
  - `lib/settings.ts`: add `notifCommunity: true` and `notifAchievements: true`.
  - `app/settings.tsx`:
    - "Comunidad" toggle for customers and owners;
    - "Logros y rachas" for customers;
    - remove Comunidad types from "Ranks" and "Respuestas" descriptions if they mention them.
  - `components/ui/NotificationsSheet.tsx` and `components/PushBridge.tsx`: both navigate with `notifRoute` (Task 5). Icons:
    - `mission` → trophy;
    - `streak` → flame;
    - `reply_like` → heart;
    - `reply_reply` → `message-circle`;
    - `user_mention` → at-sign;
    - `poll_ended` → chart-bar.
- [ ] **Step 1:** Implement.
- [ ] **Step 2:** tsc and lint clean, and `node --test` passes.
- [ ] **Step 3:** Commit `feat(avisos): rutas unificadas, íconos y ajustes Comunidad y Logros`.

### Task 11: Version, changelog, review

- [ ] **Step 1:** `app.config.ts` version `1.2.0`. In `lib/changelog.ts`, a 1.2.0 entry with sections "Conversaciones", "Encuestas", "Comparte" and "Avisos". In `landing/novedades.html`, the "Nuevo en la versión 1.2" block.
- [ ] **Step 2:** Final review of the whole branch with a fresh reviewer. Fix Critical and Important findings with TDD.
- [ ] **Step 3:** Run every check: SQL tests of Tasks 1–4, node tests, tsc and lint. Then push to `main`. The iOS 1.2.0 build waits until the owner confirms 1.1.0 is approved.
