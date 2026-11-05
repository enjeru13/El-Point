-- Comunidad: publicar y responder (migración 20261105010200).

create temp table _w as
select pg_temp.new_user('Ana') as a,
       pg_temp.new_user('Beto') as b,
       pg_temp.new_user('Caro') as c,
       pg_temp.new_user('Dueño', 'restaurant_owner') as o,
       (select id from public.categories order by id limit 1) as cat,
       gen_random_uuid() as resto;
grant select on _w to authenticated;

-- Un local aprobado con dueño, para menciones.
insert into public.restaurants (id, owner_id, name, status, is_active)
select resto, o, 'Local de Prueba', 'approved', true from _w;

create function pg_temp.xp(p uuid) returns int language sql as
  $$ select xp from public.profiles where id = p $$;

-- Publica como p_user con create_post; vuelve a postgres al terminar.
create function pg_temp.post_as(
  p_user uuid, p_topic text default 'antojos', p_cat smallint default null,
  p_resto uuid default null, p_sugg text default null, p_client uuid default gen_random_uuid()
) returns uuid language plpgsql as $$
declare v uuid;
begin
  perform pg_temp.act_as(p_user);
  v := public.create_post(
    p_client, p_topic, 'post de prueba', p_resto, p_sugg, null,
    case when p_cat is null then '{}'::smallint[] else array[p_cat] end
  );
  perform pg_temp.as_admin_db();
  return v;
end $$;

create function pg_temp.reply_as(p_user uuid, p_post uuid, p_resto uuid default null)
returns uuid language plpgsql as $$
declare v uuid;
begin
  perform pg_temp.act_as(p_user);
  insert into public.post_replies (post_id, author_id, body, restaurant_id)
  values (p_post, p_user, 'respuesta', p_resto) returning id into v;
  perform pg_temp.as_admin_db();
  return v;
end $$;

-- Espera que la llamada falle con un código concreto.
create function pg_temp.fails_with(p_sql text, p_code text, p_name text)
returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FAIL: % (no falló)', p_name;
exception when others then
  perform pg_temp.as_admin_db();
  if sqlerrm like 'FAIL:%' then raise; end if;
  if sqlerrm <> p_code then
    raise exception 'FAIL: % (falló con "%", se esperaba "%")', p_name, sqlerrm, p_code;
  end if;
  raise notice 'ok: %', p_name;
end $$;

-- create_post_ok_con_categoria: +3 del post y +20 de la misión first_post.
create temp table _a as select pg_temp.xp((select a from _w)) as xp0;
create temp table _p1 as select pg_temp.post_as((select a from _w), 'antojos', (select cat from _w)) as id;
select pg_temp.ok((select count(*) from public.post_categories where post_id = (select id from _p1)) = 1,
  'create_post_ok_con_categoria');
select pg_temp.ok(pg_temp.xp((select a from _w)) = (select xp0 from _a) + 23, 'primer post da 3 + 20 de misión');
select pg_temp.ok(exists (select 1 from public.user_missions where user_id = (select a from _w) and mission = 'first_post'),
  'misión first_post concedida');

-- create_post_idempotent
create temp table _k as select gen_random_uuid() as k;
create temp table _p2 as select pg_temp.post_as((select a from _w), 'antojos', (select cat from _w), null, null, (select k from _k)) as id;
select pg_temp.ok(
  pg_temp.post_as((select a from _w), 'antojos', (select cat from _w), null, null, (select k from _k)) = (select id from _p2),
  'create_post_idempotent devuelve el mismo id');
select pg_temp.ok((select count(*) from public.posts where author_id = (select a from _w) and client_id = (select k from _k)) = 1,
  'create_post_idempotent crea una sola fila');

-- cuarto_post_no_da_xp (Ana ya lleva 2 posts hoy)
select pg_temp.post_as((select a from _w), 'antojos', (select cat from _w));
create temp table _a4 as select pg_temp.xp((select a from _w)) as xp0;
select pg_temp.post_as((select a from _w), 'antojos', (select cat from _w));
select pg_temp.ok(pg_temp.xp((select a from _w)) = (select xp0 from _a4), 'cuarto_post_no_da_xp');

-- post_needs_tag / comensal_no_usa_novedades
select pg_temp.fails_with(
  format('select pg_temp.post_as(%L)', (select b from _w)), 'post_needs_tag', 'post_needs_tag');
select pg_temp.fails_with(
  format('select pg_temp.post_as(%L, %L, %s::smallint)', (select b from _w), 'novedades', (select cat from _w)),
  'invalid_topic', 'comensal_no_usa_novedades');

-- once_posts_rate_limited (Ana lleva 4; 6 más = 10; el siguiente falla)
select pg_temp.post_as((select a from _w), 'antojos', (select cat from _w)) from generate_series(1, 6);
select pg_temp.fails_with(
  format('select pg_temp.post_as(%L, %L, %s::smallint)', (select a from _w), 'antojos', (select cat from _w)),
  'post_rate_limited', 'once_posts_rate_limited');

-- sugerencia_creada: "El Fogón" y "fogon" van a la misma sugerencia.
select pg_temp.post_as((select b from _w), 'locales_nuevos', null, null, 'El Fogón Prueba');
select pg_temp.post_as((select b from _w), 'locales_nuevos', null, null, 'fogon prueba');
select pg_temp.ok(
  (select status from public.local_suggestions where normalized_name = 'fogon prueba') = 'pendiente',
  'sugerencia_creada en pendiente');
select pg_temp.ok(
  (select count(*) from public.local_suggestions where normalized_name like 'fogon prueba%') = 1,
  'mismo nombre normalizado, una sola sugerencia');

-- sugerencia_descartada_no_reabre
update public.local_suggestions set status = 'descartado' where normalized_name = 'fogon prueba';
select pg_temp.post_as((select b from _w), 'locales_nuevos', null, null, 'FOGÓN PRUEBA');
select pg_temp.ok(
  (select status from public.local_suggestions where normalized_name = 'fogon prueba') = 'descartado',
  'sugerencia_descartada_no_reabre');

-- mencion_notifica_dueno
select pg_temp.post_as((select b from _w), 'recomiendame', null, (select resto from _w));
select pg_temp.ok(
  (select count(*) from public.notifications where recipient_id = (select o from _w) and type = 'post_mention') = 1,
  'mencion_notifica_dueno');

-- respuesta_da_uno_por_persona: Beto responde 2 veces al post de Ana.
create temp table _r as select pg_temp.xp((select a from _w)) as xp0;
select pg_temp.reply_as((select b from _w), (select id from _p1));
select pg_temp.reply_as((select b from _w), (select id from _p1));
select pg_temp.ok(pg_temp.xp((select a from _w)) = (select xp0 from _r) + 1, 'respuesta_da_uno_por_persona');
select pg_temp.ok((select reply_count from public.posts where id = (select id from _p1)) = 2, 'reply_count = 2');
select pg_temp.ok(
  exists (select 1 from public.notifications where recipient_id = (select a from _w) and type = 'post_reply'),
  'respuesta avisa al autor');

-- recomendacion_tope_5: Caro pregunta 6 veces, Beto recomienda un local en cada una.
create temp table _rec as
select pg_temp.post_as((select c from _w), 'recomiendame', (select cat from _w)) as id
from generate_series(1, 6);
create temp table _b as select pg_temp.xp((select b from _w)) as xp0;
select pg_temp.reply_as((select b from _w), id, (select resto from _w)) from _rec;
select pg_temp.ok(pg_temp.xp((select b from _w)) = (select xp0 from _b) + 10, 'recomendacion_tope_5');

-- sesenta_y_una_respuestas (Beto ya lleva 8 respuestas)
select pg_temp.reply_as((select b from _w), (select id from _p1)) from generate_series(1, 52);
select pg_temp.fails_with(
  format('select pg_temp.reply_as(%L, %L)', (select b from _w), (select id from _p1)),
  'reply_rate_limited', 'sesenta_y_una_respuestas');

drop table _w, _a, _p1, _k, _p2, _a4, _r, _rec, _b;
