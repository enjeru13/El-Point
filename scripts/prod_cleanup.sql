-- ═══════════════════════════════════════════════════════════════════════════
-- Limpieza de producción tras salir al App Store (2026-11-07).
--
-- Se quedan las 5 cuentas: tu admin, las 2 de revisión de Apple y las 2 de
-- gente real (ojachc1, derecksebastian8). Ninguna cuenta se borra.
--
-- Se borra todo el contenido de prueba:
--   * los 6 locales de demostración (sin dueño), con sus platos, fotos,
--     reseñas y estadísticas;
--   * todas las reseñas, posts, respuestas, me gusta, reportes, sugerencias,
--     XP de Comunidad y estadísticas de visitas (todo era de prueba);
--   * las notificaciones, misiones, favoritos, XP y rachas de tu cuenta y
--     de las de revisión, que vuelven a nivel 1.
-- El "Restaurante de Prueba" de la cuenta de revisión se queda, pero pausado
-- (el público no lo ve). Se vuelve a encender solo para una revisión de Apple.
--
-- No se toca nada de las 2 cuentas reales: no tienen reseñas ni posts.
-- Todo va en una transacción: si algo falla, no se borra nada.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create temp table _test_accounts as
select id from auth.users
where email in (
  'angeleduardocegarrataborda@gmail.com',
  'atencion.elpoint+comensal@gmail.com',
  'atencion.elpoint+dueno@gmail.com'
);

-- Freno: las cuentas reales no tienen contenido. Si ya escribieron algo, se
-- detiene todo para no borrárselo.
do $$
begin
  if exists (
    select 1 from public.reviews where author_id not in (select id from _test_accounts)
    union all
    select 1 from public.posts where author_id not in (select id from _test_accounts)
    union all
    select 1 from public.post_replies where author_id not in (select id from _test_accounts)
  ) then
    raise exception 'Una cuenta real ya publicó algo. No se borró nada: avísale a Claude.';
  end if;
end $$;

-- 1. Locales de demostración (todos los que no tienen dueño).
delete from public.restaurants where owner_id is null;

-- 2. Contenido de prueba (todo es de las cuentas de prueba, comprobado arriba).
delete from public.posts;                 -- en cascada: fotos, categorías, me gusta, respuestas, reportes
delete from public.local_suggestions;
delete from public.community_xp_log;
delete from public.reviews;               -- en cascada: fotos, útiles, respuestas, reportes
delete from public.restaurant_reports;
delete from public.restaurant_events;

-- 3. Cuentas de prueba como nuevas.
delete from public.notifications where recipient_id in (select id from _test_accounts);
delete from public.user_missions  where user_id      in (select id from _test_accounts);
delete from public.favorites      where user_id      in (select id from _test_accounts);
update public.profiles
  set xp = 0, level = 1, strikes = 0, banned_at = null,
      streak_weeks = 0, streak_best = 0, streak_week_start = null
  where id in (select id from _test_accounts);

-- 4. El local de revisión: pausado y con sus contadores en cero.
update public.restaurants
  set is_active = false, rating_avg = 0, rating_count = 0,
      community_banned_at = null, community_removals = 0
  where owner_id in (select id from auth.users where email = 'atencion.elpoint+dueno@gmail.com');

commit;

-- Resultado
select jsonb_pretty(jsonb_build_object(
  'locales', (select jsonb_agg(jsonb_build_object('nombre', name, 'visible', is_active)) from public.restaurants),
  'resenas', (select count(*) from public.reviews),
  'posts', (select count(*) from public.posts),
  'usuarios', (select jsonb_agg(jsonb_build_object('email', u.email, 'xp', p.xp, 'nivel', p.level))
               from auth.users u join public.profiles p on p.id = u.id)
)) as despues;
