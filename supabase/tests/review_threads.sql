-- Hilos en reseñas (migración 20261112000000).

create temp table _t as
select pg_temp.new_user('Autora R') as a,      -- autora de la reseña
       pg_temp.new_user('Bea R') as b,
       pg_temp.new_user('Carlos R') as c,
       pg_temp.new_user('Dani R') as d,
       gen_random_uuid() as rid,
       gen_random_uuid() as rv,
       gen_random_uuid() as rv2;
grant select on _t to anon, authenticated;

select pg_temp.as_admin_db();
insert into public.restaurants (id, name, status, location)
values ((select rid from _t), 'Local R', 'approved', st_point(-71.50000, 8.50000)::geography);
insert into public.reviews (id, restaurant_id, author_id, rating, body)
values ((select rv from _t), (select rid from _t), (select a from _t), 5, 'Reseña de prueba con hilo'),
       ((select rv2 from _t), (select rid from _t), (select d from _t), 3, 'Otra reseña de prueba');

-- hilo_se_crea_una_vez
select pg_temp.as_admin_db();
create temp table _xp as select xp from public.profiles where id = (select a from _t);
grant select on _xp to anon, authenticated;
select pg_temp.act_as((select b from _t));
create temp table _h as select public.open_review_thread((select rv from _t)) as p;
grant select on _h to anon, authenticated;
select pg_temp.ok((select p is not null from _h), 'hilo_se_crea');
select pg_temp.ok(public.open_review_thread((select rv from _t)) = (select p from _h), 'hilo_se_crea_una_vez: mismo id');
select pg_temp.as_admin_db();
select pg_temp.ok((select count(*) = 1 from public.posts where review_id = (select rv from _t)), 'hilo_se_crea_una_vez: una sola fila');
select pg_temp.ok(
  (select author_id = (select a from _t) and topic = 'resenas' from public.posts where id = (select p from _h)),
  'hilo: del autor de la reseña, tema resenas');
select pg_temp.ok(
  (select p.xp = x.xp from public.profiles p, _xp x where p.id = (select a from _t)),
  'hilo_sin_xp: abrir el hilo no suma XP');

-- hilo_no_sale_como_post_en_el_feed
select pg_temp.act_as((select b from _t));
select pg_temp.ok(
  (select count(*) = 0 from public.community_feed() where id = (select p from _h) and kind = 'post'),
  'hilo_no_sale_como_post');
select pg_temp.ok(
  (select count(*) = 1 from public.community_feed() where id = (select rv from _t) and kind = 'review'),
  'resena_sigue_en_el_feed');
select pg_temp.ok(
  (select thread_post_id = (select p from _h) and reply_count = 0 from public.community_feed() where id = (select rv from _t)),
  'resena_trae_su_hilo: thread_post_id y 0 respuestas');
select pg_temp.ok(
  (select thread_post_id is null from public.community_feed() where id = (select rv2 from _t)),
  'resena_sin_hilo: thread_post_id nulo');

-- responder_a_una_resena
insert into public.post_replies (post_id, author_id, body) values ((select p from _h), (select b from _t), 'Yo también fui, buenísimo');
select pg_temp.act_as((select c from _t));
insert into public.post_replies (post_id, author_id, body) values ((select p from _h), (select c from _t), 'Gracias por la reseña');
select pg_temp.as_admin_db();
select pg_temp.ok((select reply_count = 2 from public.posts where id = (select p from _h)), 'responder: reply_count = 2');

-- conteo_en_el_feed + detalle_con_forma_de_resena
select pg_temp.act_as((select d from _t));
select pg_temp.ok(
  (select reply_count = 2 from public.community_feed() where id = (select rv from _t)),
  'conteo_en_el_feed: la reseña muestra 2');
select pg_temp.ok(
  (select kind = 'review' and id = (select p from _h) and review_id = (select rv from _t)
          and rating = 5 and restaurant_name = 'Local R' and body = 'Reseña de prueba con hilo'
   from public.community_feed(p_post => (select p from _h))),
  'detalle_con_forma_de_resena: estrellas, local y texto, id del hilo');
select pg_temp.ok(
  (select count(*) = 1 from public.community_feed(p_post => (select p from _h))),
  'detalle: una sola fila');

-- avisos: a la autora, con "reseña"
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select count(*) = 2 from public.notifications
    where recipient_id = (select a from _t) and type = 'post_reply' and title like '%respondió tu reseña'),
  'aviso_resena: la autora recibe "respondió tu reseña" (2)');

-- xp_una_vez_por_persona
select pg_temp.ok(
  (select count(*) = 2 from public.community_xp_log where user_id = (select a from _t) and reason = 'reply_received' and not reverted),
  'xp: +1 por cada persona que responde');

-- perfil_y_enlace_publico_ignoran_el_hilo
select pg_temp.act_as((select d from _t));
select pg_temp.ok(
  (select (public.get_public_profile((select a from _t)) ->> 'post_count')::int = 0),
  'perfil: el hilo no cuenta como post');
select pg_temp.as_admin_db();
set local role anon;
select pg_temp.ok(public.get_public_post((select p from _h)) is null, 'enlace_publico: el hilo no se comparte');
reset role;

-- bloqueo
select pg_temp.as_admin_db();
insert into public.user_blocks (blocker_id, blocked_id) values ((select a from _t), (select c from _t));
select pg_temp.act_as((select c from _t));
do $$
begin
  perform public.open_review_thread((select rv from _t));
  raise exception 'FAIL: bloqueado_no_abre_hilo';
exception when sqlstate '42501' then
  null;
end $$;
select pg_temp.ok(true, 'bloqueado_no_abre_hilo');
select pg_temp.ok(
  (select count(*) = 0 from public.community_feed(p_post => (select p from _h))),
  'bloqueado_no_ve_el_detalle');
select pg_temp.as_admin_db();
delete from public.user_blocks where blocker_id = (select a from _t);

-- sin_sesion
set local role anon;
do $$
begin
  perform public.open_review_thread((select rv from _t));
  raise exception 'FAIL: sin_sesion';
exception when insufficient_privilege or sqlstate '28000' then
  null;
end $$;
reset role;
select pg_temp.ok(true, 'sin_sesion_no_abre_hilo');

-- resena_inexistente
select pg_temp.act_as((select b from _t));
do $$
begin
  perform public.open_review_thread(gen_random_uuid());
  raise exception 'FAIL: resena_inexistente';
exception when sqlstate 'P0002' then
  null;
end $$;
select pg_temp.ok(true, 'resena_inexistente');

-- moderacion: si se retira la reseña, el hilo se oculta y las respuestas dejan de verse
select pg_temp.as_admin_db();
select set_config('app.elpoint_privileged', 'on', true);
update public.reviews set moderation = 'removed' where id = (select rv from _t);
select set_config('app.elpoint_privileged', 'off', true);
select pg_temp.ok((select moderation = 'hidden' from public.posts where id = (select p from _h)), 'moderacion: el hilo se oculta con la reseña');
select pg_temp.act_as((select b from _t));
select pg_temp.ok(
  (select count(*) = 0 from public.community_feed(p_post => (select p from _h))),
  'moderacion: el detalle no sale');
select pg_temp.as_admin_db();

-- borrar la reseña borra el hilo y sus respuestas
select set_config('app.elpoint_privileged', 'on', true);
update public.reviews set moderation = 'visible' where id = (select rv from _t);
select set_config('app.elpoint_privileged', 'off', true);
delete from public.reviews where id = (select rv from _t);
select pg_temp.ok(
  not exists (select 1 from public.posts where id = (select p from _h))
  and not exists (select 1 from public.post_replies where post_id = (select p from _h)),
  'cascada: borrar la reseña borra el hilo y sus respuestas');
