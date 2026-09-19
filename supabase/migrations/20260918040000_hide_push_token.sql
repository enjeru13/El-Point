-- SEGURIDAD: profiles.push_token era legible por cualquiera con la llave
-- pública (anon) -- "profiles are viewable by everyone" + grant select a nivel
-- de tabla. Un token de Expo Push permite mandar notificaciones a ese
-- dispositivo, así que se podía spamear a todos los usuarios de la app.
--
-- Privilegios por columna: se quita el select de tabla y se concede columna
-- por columna todo MENOS push_token. Nadie lo lee desde la app (push.ts solo
-- lo escribe, y el update no cambia); send_push_on_notification() es
-- security definer y lo sigue leyendo como dueño.
--
-- OJO: cualquier columna nueva en profiles necesita su propio
-- "grant select (columna) on public.profiles to anon, authenticated",
-- si no la app no la va a poder leer.

revoke select on public.profiles from anon, authenticated;

grant select (
  id, role, username, full_name, avatar_url, bio, level, xp,
  streak_weeks, streak_best, streak_week_start, search_radius_km, settings,
  favorite_categories, is_admin, strikes, banned_at, referral_code,
  referral_reward_claimed, referred_by, created_at, updated_at
) on public.profiles to anon, authenticated;
