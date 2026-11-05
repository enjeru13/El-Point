-- Comunidad: XP con tope diario y descuento (migración 20261105010100).

create temp table _x as
select pg_temp.new_user('Autora') as a,
       pg_temp.new_user('Beto') as b,
       pg_temp.new_user('Carla') as c,
       pg_temp.new_user('Dani') as d,
       pg_temp.new_user('Dueño', 'restaurant_owner') as o,
       (select id from public.restaurants where status = 'approved' and is_active limit 1) as resto;

create function pg_temp.xp(p uuid) returns int language sql as
  $$ select xp from public.profiles where id = p $$;

create function pg_temp.new_post(p_author uuid, p_as uuid default null) returns uuid language sql as $$
  insert into public.posts (author_id, as_restaurant_id, topic, body, client_id)
  values (p_author, p_as, case when p_as is null then 'antojos' else 'novedades' end, 'post de prueba', gen_random_uuid())
  returning id
$$;

-- like_da_uno
create temp table _p as select pg_temp.new_post((select a from _x)) as id, pg_temp.xp((select a from _x)) as xp0;
insert into public.post_likes (user_id, post_id) select b, (select id from _p) from _x;
select pg_temp.ok(pg_temp.xp((select a from _x)) = (select xp0 from _p) + 1, 'like_da_uno');
select pg_temp.ok((select like_count from public.posts where id = (select id from _p)) = 1, 'like_count = 1');

-- like_propio_no_da
insert into public.post_likes (user_id, post_id) select a, (select id from _p) from _x;
select pg_temp.ok(pg_temp.xp((select a from _x)) = (select xp0 from _p) + 1, 'like_propio_no_da');

-- like_unlike_relike_net_one (B ya dio me gusta arriba)
delete from public.post_likes where user_id = (select b from _x) and post_id = (select id from _p);
select pg_temp.ok(pg_temp.xp((select a from _x)) = (select xp0 from _p), 'quitar me gusta descuenta');
insert into public.post_likes (user_id, post_id) select b, (select id from _p) from _x;
select pg_temp.ok(pg_temp.xp((select a from _x)) = (select xp0 from _p) + 1, 'like_unlike_relike_net_one');
select pg_temp.ok(
  (select count(*) from public.community_xp_log
   where source_key = 'like:' || (select id from _p) || ':' || (select b from _x) and not reverted) = 1,
  'una sola fila activa por me gusta'
);

-- borrar_post_descuenta: con 3 me gusta de distintos, borrar vuelve al inicio.
insert into public.post_likes (user_id, post_id) select c, (select id from _p) from _x;
insert into public.post_likes (user_id, post_id) select d, (select id from _p) from _x;
select pg_temp.ok(pg_temp.xp((select a from _x)) = (select xp0 from _p) + 3, 'tres me gusta = +3');
delete from public.posts where id = (select id from _p);
select pg_temp.ok(pg_temp.xp((select a from _x)) = (select xp0 from _p), 'borrar_post_descuenta');

-- post_de_local_no_da
create temp table _q as
select pg_temp.new_post((select o from _x), (select resto from _x)) as id, pg_temp.xp((select o from _x)) as xp0;
insert into public.post_likes (user_id, post_id) select b, (select id from _q) from _x;
select pg_temp.ok(pg_temp.xp((select o from _x)) = (select xp0 from _q), 'post_de_local_no_da');

-- tope_20_por_dia (Carla empieza el día sin XP de Comunidad)
create temp table _t as select pg_temp.xp((select c from _x)) as xp0;
select public.award_community_xp((select c from _x), 1, 'like_received', 'test:' || i, null, null)
from generate_series(1, 25) i;
select pg_temp.ok(pg_temp.xp((select c from _x)) = (select xp0 from _t) + 20, 'tope_20_por_dia');
select pg_temp.ok(
  public.award_community_xp((select c from _x), 1, 'like_received', 'test:extra', null, null) = 0,
  'la llamada 21 devuelve 0'
);

drop table _x, _p, _q, _t;
