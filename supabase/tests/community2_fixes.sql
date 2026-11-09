-- Arreglos de Comunidad 2 (migración 20261111040000).

create temp table _f as
select pg_temp.new_user('Autora F') as a,
       pg_temp.new_user('Bea F') as b,
       pg_temp.new_user('Carlos F') as c,
       gen_random_uuid() as p1;
grant select on _f to anon, authenticated;

update public.profiles set username = 'juan_perez_f' where id = (select b from _f);
insert into public.posts (id, author_id, topic, body, client_id)
values ((select p1 from _f), (select a from _f), 'antojos', 'Post de arreglos', gen_random_uuid());

-- 3: buscar con guion bajo
select pg_temp.act_as((select c from _f));
select pg_temp.ok(
  exists (select 1 from public.search_mention_users('juan_p', null) where username = 'juan_perez_f'),
  'busqueda_guion_bajo');
select pg_temp.ok(public.user_id_by_username('JUAN_PEREZ_F') = (select b from _f), 'id_por_usuario_exacto');

-- 4: sin spam de menciones
insert into public.post_replies (post_id, author_id, body) values ((select p1 from _f), (select c from _f), 'hola @juan_perez_f');
insert into public.post_replies (post_id, author_id, body) values ((select p1 from _f), (select c from _f), 'otra vez @juan_perez_f');
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select count(*) = 1 from public.notifications where recipient_id = (select b from _f) and type = 'user_mention'),
  'mencion_sin_spam: un aviso sin leer por autor');

-- 1: no se borra una respuesta en revisión
select set_config('app.elpoint_privileged', 'on', true);
update public.post_replies set moderation = 'hidden'
  where id = (select id from public.post_replies where author_id = (select c from _f) order by created_at limit 1);
select set_config('app.elpoint_privileged', 'off', true);
select pg_temp.act_as((select c from _f));
do $$ begin
  perform public.delete_my_reply((select id from public.post_replies where author_id = (select c from _f) and moderation = 'hidden'));
  raise exception 'FAIL: borró en revisión';
exception when raise_exception then if sqlerrm like 'FAIL%' or sqlerrm <> 'reply_under_review' then raise; end if; end $$;
select pg_temp.ok(true, 'no_borra_en_revision');

-- 5 + 9: borrar con hijos no cuenta y no se puede responder a una borrada
select pg_temp.act_as((select b from _f));
insert into public.post_replies (post_id, author_id, body) values ((select p1 from _f), (select b from _f), 'Raíz de Bea');
select pg_temp.act_as((select c from _f));
insert into public.post_replies (post_id, author_id, body, parent_reply_id)
values ((select p1 from _f), (select c from _f), 'Hijo de Carlos',
        (select id from public.post_replies where body = 'Raíz de Bea'));
select pg_temp.act_as((select b from _f));
select public.delete_my_reply((select id from public.post_replies where body = 'Raíz de Bea'));
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select reply_count = (select count(*) from public.post_replies r
                         where r.post_id = p.id and r.moderation = 'visible' and r.author_deleted_at is null)
   from public.posts p where p.id = (select p1 from _f)),
  'conteo_sin_borradas');
select pg_temp.act_as((select c from _f));
do $$ begin
  insert into public.post_replies (post_id, author_id, body, parent_reply_id)
  values ((select p1 from _f), (select c from _f), 'A una borrada',
          (select id from public.post_replies where author_deleted_at is not null limit 1));
  raise exception 'FAIL: respondió a una borrada';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end $$;
select pg_temp.ok(true, 'no_responde_a_borrada');

-- 7: votar la propia encuesta no da XP
select pg_temp.act_as((select a from _f));
select public.create_poll((select p1 from _f), 1, '[{"label":"Sí"},{"label":"No"}]');
select public.vote_poll((select p1 from _f), (select id from public.post_poll_options where post_id = (select p1 from _f) and position = 1));
select pg_temp.as_admin_db();
select pg_temp.ok(
  not exists (select 1 from public.community_xp_log where user_id = (select a from _f) and reason = 'poll_vote'),
  'voto_propio_sin_xp');
