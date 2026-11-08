-- Solo lectura: qué hay hoy en producción, antes de limpiar.
-- npx supabase@3 db query --linked --yes -f scripts/prod_inventory.sql

select jsonb_pretty(jsonb_build_object(
  'usuarios', (
    select jsonb_agg(jsonb_build_object(
      'email', u.email,
      'creado', to_char(u.created_at at time zone 'America/Caracas', 'YYYY-MM-DD HH24:MI'),
      'ultimo_ingreso', to_char(u.last_sign_in_at at time zone 'America/Caracas', 'YYYY-MM-DD HH24:MI'),
      'rol', p.role,
      'admin', p.is_admin,
      'resenas', (select count(*) from public.reviews r where r.author_id = u.id),
      'posts', (select count(*) from public.posts po where po.author_id = u.id)
    ) order by u.created_at)
    from auth.users u left join public.profiles p on p.id = u.id
  ),
  'locales', (
    select jsonb_agg(jsonb_build_object(
      'nombre', r.name,
      'estado', r.status,
      'visible', r.is_active,
      'original', r.founder_rank,
      'dueno', (select email from auth.users where id = r.owner_id),
      'creado', to_char(r.created_at at time zone 'America/Caracas', 'YYYY-MM-DD HH24:MI')
    ) order by r.created_at)
    from public.restaurants r
  ),
  'totales', jsonb_build_object(
    'resenas', (select count(*) from public.reviews),
    'posts', (select count(*) from public.posts),
    'respuestas', (select count(*) from public.post_replies),
    'notificaciones', (select count(*) from public.notifications),
    'mensajes_soporte', (select count(*) from public.support_messages),
    'pagos', (select count(*) from public.restaurant_payments)
  )
)) as inventario;
