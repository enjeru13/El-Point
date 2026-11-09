-- Hilos de respuestas (migración 20261111000000).

create temp table _t as
select pg_temp.new_user('Autora T') as a,      -- autora del post
       pg_temp.new_user('Bea T') as b,
       pg_temp.new_user('Carlos T') as c,
       pg_temp.new_user('Dani T') as d,
       gen_random_uuid() as p1,
       gen_random_uuid() as p2;
grant select on _t to anon, authenticated;

select pg_temp.as_admin_db();
insert into public.posts (id, author_id, topic, body, client_id)
values ((select p1 from _t), (select a from _t), 'antojos', 'Post uno de prueba', gen_random_uuid()),
       ((select p2 from _t), (select a from _t), 'antojos', 'Post dos de prueba', gen_random_uuid());

-- Bea responde al post; Carlos responde a Bea.
select pg_temp.act_as((select b from _t));
insert into public.post_replies (post_id, author_id, body) values ((select p1 from _t), (select b from _t), 'Respuesta de Bea');
create temp table _r as select id as rb from public.post_replies where author_id = (select b from _t) and post_id = (select p1 from _t);
grant select on _r to anon, authenticated;

-- hilo_padre_otro_post
select pg_temp.act_as((select c from _t));
do $$
begin
  insert into public.post_replies (post_id, author_id, body, parent_reply_id)
  values ((select p2 from _t), (select c from _t), 'Mal colgada', (select rb from _r));
  raise exception 'FAIL: hilo_padre_otro_post';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select pg_temp.ok(true, 'hilo_padre_otro_post');

-- aviso_respuesta_a_respuesta
insert into public.post_replies (post_id, author_id, body, parent_reply_id)
values ((select p1 from _t), (select c from _t), 'Carlos responde a Bea', (select rb from _r));
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select count(*) = 1 from public.notifications where recipient_id = (select b from _t) and type = 'reply_reply'),
  'aviso_respuesta_a_respuesta: Bea recibe reply_reply');
select pg_temp.ok(
  (select count(*) = 2 from public.notifications where recipient_id = (select a from _t) and type = 'post_reply'),
  'aviso_respuesta_a_respuesta: la autora sigue recibiendo post_reply');

-- like_respuesta_cuenta_y_xp
select pg_temp.act_as((select c from _t));
insert into public.post_reply_likes (reply_id, user_id) values ((select rb from _r), (select c from _t));
select pg_temp.as_admin_db();
select pg_temp.ok((select like_count = 1 from public.post_replies where id = (select rb from _r)), 'like_respuesta: cuenta 1');
select pg_temp.ok(
  exists (select 1 from public.community_xp_log where user_id = (select b from _t) and source_key = 'rlike:' || (select rb from _r) || ':' || (select c from _t) and not reverted),
  'like_respuesta: XP a Bea');

-- like_respuesta_sin_spam
select pg_temp.act_as((select d from _t));
insert into public.post_reply_likes (reply_id, user_id) values ((select rb from _r), (select d from _t));
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select count(*) = 1 from public.notifications where recipient_id = (select b from _t) and type = 'reply_like'),
  'like_respuesta_sin_spam: un solo aviso sin leer');

select pg_temp.act_as((select c from _t));
delete from public.post_reply_likes where reply_id = (select rb from _r) and user_id = (select c from _t);
select pg_temp.as_admin_db();
select pg_temp.ok((select like_count = 1 from public.post_replies where id = (select rb from _r)), 'like_respuesta: al quitar baja');
select pg_temp.ok(
  not exists (select 1 from public.community_xp_log where source_key = 'rlike:' || (select rb from _r) || ':' || (select c from _t) and not reverted),
  'like_respuesta: XP revertido');

-- borrar_ajena_falla
select pg_temp.act_as((select c from _t));
do $$
begin
  perform public.delete_my_reply((select rb from _r));
  raise exception 'FAIL: borrar_ajena_falla';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select pg_temp.ok(true, 'borrar_ajena_falla');

-- hilo_padre_eliminado: Bea borra la suya, que tiene hijo -> queda como eliminada.
select pg_temp.act_as((select b from _t));
select public.delete_my_reply((select rb from _r));
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select author_deleted_at is not null and moderation = 'visible' from public.post_replies where id = (select rb from _r)),
  'hilo_padre_eliminado: queda marcada como borrada por su autora');
select pg_temp.ok(
  exists (select 1 from public.post_replies where parent_reply_id = (select rb from _r)),
  'hilo_padre_eliminado: el hijo sigue colgando');
select pg_temp.ok(
  not exists (select 1 from public.notifications where recipient_id = (select b from _t) and type = 'moderation'),
  'hilo_padre_eliminado: no es una sanción');

-- Sin hijos: se borra de verdad.
select pg_temp.act_as((select c from _t));
select public.delete_my_reply((select id from public.post_replies where author_id = (select c from _t)));
select pg_temp.as_admin_db();
select pg_temp.ok(
  not exists (select 1 from public.post_replies where author_id = (select c from _t)),
  'borrar_sin_hijos: desaparece');
