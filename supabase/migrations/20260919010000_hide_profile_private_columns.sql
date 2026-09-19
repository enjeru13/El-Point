-- Fase 2 de profiles, paso 2: columnas sensibles ocultas a los demás.
--
-- Hasta ahora cualquiera con la llave pública podía leer de TODOS los
-- usuarios: is_admin (quiénes son admin), strikes, referral_code, settings,
-- favorite_categories, search_radius_km, xp, rachas. Ahora solo quedan
-- legibles las columnas públicas: id, role, username, full_name, avatar_url,
-- bio, level, created_at y banned_at (esta última se queda porque varias
-- políticas RLS y create_owner_restaurant la leen como invoker; ocultarla
-- exige reescribirlas, va aparte).
--
-- Cada usuario lee su fila completa con get_my_profile() (migración
-- anterior). Los triggers y funciones security definer siguen leyendo todo
-- como dueños.
--
-- OJO: columnas nuevas de profiles NO son legibles hasta que se les haga
-- "grant select (col) ... to anon, authenticated" (si es pública) o se lean
-- por get_my_profile().

revoke select (
  is_admin, strikes, referral_code, referral_reward_claimed, referred_by,
  settings, favorite_categories, search_radius_km,
  streak_weeks, streak_best, streak_week_start,
  xp, updated_at
) on public.profiles from anon, authenticated;
