-- Comunidad en lectura sin cuenta (migraciones 20261112000000 y 20261112020000).

create temp table _g as
select pg_temp.new_user('Autora G') as a,
       pg_temp.new_user('Bea G') as b,
       gen_random_uuid() as p1,
       gen_random_uuid() as rid,
       gen_random_uuid() as rv;
grant select on _g to anon, authenticated;

select pg_temp.as_admin_db();
insert into public.posts (id, author_id, topic, body, client_id)
values ((select p1 from _g), (select a from _g), 'antojos', 'Post para el visitante', gen_random_uuid());
insert into public.post_replies (post_id, author_id, body) values ((select p1 from _g), (select b from _g), 'Respuesta visible');
insert into public.post_replies (post_id, author_id, body, moderation) values ((select p1 from _g), (select b from _g), 'Respuesta oculta', 'hidden');
insert into public.restaurants (id, name, status, is_active, location)
values ((select rid from _g), 'Local G', 'approved', true, st_point(-71.50000, 8.50000)::geography);
insert into public.reviews (id, restaurant_id, author_id, rating, body)
values ((select rv from _g), (select rid from _g), (select b from _g), 4, 'Reseña para el visitante');

-- visitante_lee_el_feed_sin_ids
set local role anon;
select pg_temp.ok(
  (select count(*) >= 2 from public.community_feed(p_limit => 50)),
  'visitante_lee_el_feed');
select pg_temp.ok(
  (select bool_and(author_id is null) from public.community_feed(p_limit => 50)),
  'visitante_sin_ids: author_id viene nulo');
select pg_temp.ok(
  (select author_name = 'Autora G' from public.community_feed(p_post => (select p1 from _g))),
  'visitante_ve_el_nombre_del_autor');
select pg_temp.ok(
  (select not bool_or(viewer_liked) from public.community_feed(p_limit => 50)),
  'visitante_sin_me_gusta_propio');
reset role;

-- con_cuenta_si_hay_ids
select pg_temp.act_as((select b from _g));
select pg_temp.ok(
  (select author_id = (select a from _g) from public.community_feed(p_post => (select p1 from _g))),
  'con_cuenta_el_feed_trae_author_id');
select pg_temp.as_admin_db();

-- visitante_lee_respuestas_visibles_sin_ids
set local role anon;
select pg_temp.ok(
  (select jsonb_array_length(public.public_post_replies((select p1 from _g))) = 1),
  'respuestas_del_visitante: solo la visible');
select pg_temp.ok(
  (select (public.public_post_replies((select p1 from _g)) -> 0 ->> 'body') = 'Respuesta visible'),
  'respuestas_del_visitante: texto');
select pg_temp.ok(
  (select not ((public.public_post_replies((select p1 from _g)) -> 0) ? 'author_id')),
  'respuestas_del_visitante: sin author_id');
select pg_temp.ok(
  (select (public.public_post_replies((select p1 from _g)) -> 0 -> 'author' ->> 'full_name') = 'Bea G'),
  'respuestas_del_visitante: nombre de quien responde');
select pg_temp.ok(
  (select (public.poll_states(array[(select p1 from _g)])) = '{}'::jsonb),
  'visitante_poll_states: sin encuesta devuelve vacío');
reset role;

-- post_oculto_no_se_lee
select set_config('app.elpoint_privileged', 'on', true);
update public.posts set moderation = 'hidden' where id = (select p1 from _g);
select set_config('app.elpoint_privileged', 'off', true);
set local role anon;
select pg_temp.ok(public.public_post_replies((select p1 from _g)) = '[]'::jsonb, 'post_oculto: sin respuestas');
select pg_temp.ok((select count(*) = 0 from public.community_feed(p_post => (select p1 from _g))), 'post_oculto: no sale en el feed');
reset role;

-- hilo_de_resena_visible_para_el_visitante
select pg_temp.act_as((select a from _g));
create temp table _h as select public.open_review_thread((select rv from _g)) as p;
grant select on _h to anon, authenticated;
insert into public.post_replies (post_id, author_id, body) values ((select p from _h), (select a from _g), 'Respuesta a la reseña');
select pg_temp.as_admin_db();
set local role anon;
select pg_temp.ok(
  (select kind = 'review' and rating = 4 and reply_count = 1 from public.community_feed(p_post => (select p from _h))),
  'visitante_ve_el_hilo_de_la_resena');
select pg_temp.ok(
  (select jsonb_array_length(public.public_post_replies((select p from _h))) = 1),
  'visitante_ve_las_respuestas_de_la_resena');
reset role;

-- lo_privado_sigue_cerrado
set local role anon;
do $$
begin
  perform count(*) from public.posts;
  raise exception 'FAIL: posts_abierto';
exception when insufficient_privilege then
  null;
end $$;
do $$
begin
  perform count(*) from public.post_replies;
  raise exception 'FAIL: post_replies_abierto';
exception when insufficient_privilege then
  null;
end $$;
reset role;
select pg_temp.ok(true, 'lo_privado_sigue_cerrado: posts y respuestas');
