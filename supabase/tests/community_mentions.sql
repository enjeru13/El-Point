-- Menciones y perfil público (migración 20261111010000).

create temp table _m as
select pg_temp.new_user('Autor M') as a,
       pg_temp.new_user('Ana M') as b,
       pg_temp.new_user('Carlos M') as c,
       pg_temp.new_user('Bloqueador M') as d,
       gen_random_uuid() as p1;
grant select on _m to anon, authenticated;

update public.profiles set username = 'autor_m' where id = (select a from _m);
update public.profiles set username = 'Ana_M' where id = (select b from _m);
update public.profiles set username = 'carlos_m' where id = (select c from _m);
update public.profiles set username = 'bloq_m' where id = (select d from _m);
insert into public.user_blocks (blocker_id, blocked_id) values ((select d from _m), (select a from _m));

-- extrae_menciones
select pg_temp.ok(
  public.extract_mentions('hola @Ana y @ana, @b @carlos_1 correo x@y.com') = array['ana', 'carlos_1'],
  'extrae_menciones');

-- mencion_avisa + mencion_bloqueada
insert into public.posts (id, author_id, topic, body, client_id)
values ((select p1 from _m), (select a from _m), 'antojos', 'Vamos @ana_m y @bloq_m', gen_random_uuid());
select pg_temp.ok(
  (select count(*) = 1 from public.notifications where recipient_id = (select b from _m) and type = 'user_mention'),
  'mencion_avisa: Ana (sin importar mayúsculas)');
select pg_temp.ok(
  not exists (select 1 from public.notifications where recipient_id = (select d from _m) and type = 'user_mention'),
  'mencion_bloqueada: quien bloqueó al autor no recibe');

-- tope de 5
select pg_temp.ok(
  cardinality(public.extract_mentions('@aaa @bbb @ccc @ddd @eee @fff')) = 5,
  'mencion_tope: máximo 5');

-- mencion_sin_doble_aviso: Carlos responde a Ana mencionándola -> solo reply_reply.
select pg_temp.act_as((select b from _m));
insert into public.post_replies (post_id, author_id, body) values ((select p1 from _m), (select b from _m), 'Respuesta de Ana');
select pg_temp.act_as((select c from _m));
insert into public.post_replies (post_id, author_id, body, parent_reply_id)
values ((select p1 from _m), (select c from _m), 'De acuerdo @ana_m',
        (select id from public.post_replies where author_id = (select b from _m)));
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select count(*) = 1 from public.notifications where recipient_id = (select b from _m) and type = 'user_mention'),
  'mencion_sin_doble_aviso: no suma otra mención');
select pg_temp.ok(
  (select count(*) = 1 from public.notifications where recipient_id = (select b from _m) and type = 'reply_reply'),
  'mencion_sin_doble_aviso: recibe reply_reply');

-- perfil_publico
select pg_temp.act_as((select c from _m));
select pg_temp.ok(
  (select public.get_public_profile((select b from _m)) ->> 'username' = 'Ana_M'
      and not (public.get_public_profile((select b from _m)) ? 'email')),
  'perfil_publico: usuario sin correo');
select pg_temp.act_as((select a from _m));
select pg_temp.ok(public.get_public_profile((select d from _m)) is null, 'perfil_publico: con bloqueo es null');

-- sugerencias: participantes primero
select pg_temp.act_as((select c from _m));
select pg_temp.ok(
  (select array_agg(username) from public.search_mention_users('', (select p1 from _m))) @> array['Ana_M', 'autor_m'],
  'sugerencias: incluye participantes');
select pg_temp.as_admin_db();
