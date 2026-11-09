-- Ajustes de avisos, avisos nuevos y post público (migración 20261111030000).

create temp table _n as
select pg_temp.new_user('Autora N') as a,
       pg_temp.new_user('Lectora N') as b,
       gen_random_uuid() as p1,
       gen_random_uuid() as rid;
grant select on _n to anon, authenticated;

-- promo_por_defecto_apagada + comunidad_mapeo
select pg_temp.ok(public.push_setting_default('notifPromos') = 'false', 'promo_por_defecto_apagada');
select pg_temp.ok(public.push_setting_default('notifRanks') = 'true', 'otros_por_defecto_encendidos');
select pg_temp.ok(public.push_setting_key('reply_like') = 'notifCommunity', 'comunidad_mapeo: reply_like');
select pg_temp.ok(public.push_setting_key('mission') = 'notifAchievements', 'logros_mapeo: mission');

-- migra_ajuste
update public.profiles set settings = '{"notifReplies": false}' where id = (select b from _n);
update public.profiles
  set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('notifCommunity', false)
  where settings ->> 'notifReplies' = 'false' and settings ->> 'notifCommunity' is null;
select pg_temp.ok(
  (select settings ->> 'notifCommunity' = 'false' from public.profiles where id = (select b from _n)),
  'migra_ajuste');

-- post_publico_oculto
insert into public.posts (id, author_id, topic, body, client_id)
values ((select p1 from _n), (select a from _n), 'antojos', 'Post público de prueba', gen_random_uuid());
set local role anon;
select pg_temp.ok(
  (select j ->> 'body' = 'Post público de prueba'
      and not (j ? 'author_id')
      and j::text not ilike '%email%'
      and not ((j -> 'author') ? 'id')
   from (select public.get_public_post((select p1 from _n)) as j) x),
  'post_publico: visible sin ids ni correo');
reset role;
select set_config('app.elpoint_privileged', 'on', true);
update public.posts set moderation = 'hidden' where id = (select p1 from _n);
select set_config('app.elpoint_privileged', 'off', true);
set local role anon;
select pg_temp.ok(public.get_public_post((select p1 from _n)) is null, 'post_publico_oculto: null');
reset role;

-- resena_retirada_avisa
insert into public.restaurants (id, name, status, location)
values ((select rid from _n), 'Local N', 'approved', st_point(-71.50000, 8.50000)::geography);
insert into public.reviews (restaurant_id, author_id, rating, body)
values ((select rid from _n), (select b from _n), 4, 'Reseña de prueba para retirar');
select set_config('app.elpoint_privileged', 'on', true);
update public.reviews set moderation = 'removed' where author_id = (select b from _n);
select set_config('app.elpoint_privileged', 'off', true);
select pg_temp.ok(
  exists (select 1 from public.notifications where recipient_id = (select b from _n) and data ->> 'kind' = 'review_removed'),
  'resena_retirada_avisa');
