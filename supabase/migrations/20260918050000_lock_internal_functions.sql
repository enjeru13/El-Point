-- SEGURIDAD CRÍTICA: funciones internas ejecutables por cualquiera.
--
-- Postgres da EXECUTE a PUBLIC por defecto y Supabase además a anon y
-- authenticated. Estas funciones son security definer SIN chequeo de quién
-- llama (las usan triggers y cron), así que cualquiera con la llave pública
-- (que va dentro de la app) podía llamarlas por /rest/v1/rpc/...:
--   * award_xp(p_user, p_amount)      -> XP ilimitado a cualquier usuario
--   * grant_mission(p_user, p_mission) -> misiones y su XP
--   * extend_boost(p_restaurant_id, p_days) -> "Destacado" gratis, por los
--     días que quisieran, a cualquier local (es la función que se cobra)
--   * evaluate_* / send_* -> disparar a mano trabajos de cron (notificaciones,
--     rachas) sobre usuarios reales
-- Verificado con un POST anónimo: award_xp/extend_boost/evaluate_* devolvían
-- 204 y grant_mission llegó a intentar el insert (409 por FK).
--
-- Quienes las llaman de verdad -- triggers security definer y pg_cron, que
-- corre como postgres -- son dueños de la función y no necesitan el grant.
-- La app y el admin no llaman a ninguna de estas por rpc().

revoke execute on function public.award_xp(uuid, int)               from public, anon, authenticated;
revoke execute on function public.grant_mission(uuid, text)         from public, anon, authenticated;
revoke execute on function public.extend_boost(uuid, int)           from public, anon, authenticated;
revoke execute on function public.evaluate_user_missions(uuid)      from public, anon, authenticated;
revoke execute on function public.evaluate_review_moderation(uuid)  from public, anon, authenticated;
revoke execute on function public.evaluate_restaurant_reports(uuid) from public, anon, authenticated;
revoke execute on function public.evaluate_review_streaks()         from public, anon, authenticated;
revoke execute on function public.evaluate_host_streaks()           from public, anon, authenticated;
revoke execute on function public.send_weekly_owner_reports()       from public, anon, authenticated;
revoke execute on function public.send_subscription_reminders()     from public, anon, authenticated;

-- Para que no vuelva a pasar con funciones nuevas: desde ahora una función
-- creada por postgres en public NO es ejecutable por nadie más hasta que su
-- migración haga un "grant execute ... to <rol>" explícito.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
