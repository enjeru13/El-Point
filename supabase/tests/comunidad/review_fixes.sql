-- Arreglos de la revisión final (migración 20261105030000).

create temp table _f as
select pg_temp.new_user('Fan') as a,
       pg_temp.new_user('Otro') as b,
       pg_temp.new_user('Dueño F', 'restaurant_owner') as o,
       gen_random_uuid() as resto,
       gen_random_uuid() as cid;
grant select on _f to authenticated;

insert into public.restaurants (id, owner_id, name, status, is_active)
select resto, o, 'Fogón Revisado', 'approved', true from _f;
select set_config('app.elpoint_privileged', 'on', true);
update public.restaurants set founder_rank = null, paid_until = now() + interval '30 days'
  where id = (select resto from _f);
select set_config('app.elpoint_privileged', 'off', true);

-- guardas_perfil: un usuario no puede subirse XP, quitarse strikes ni hacerse admin.
select pg_temp.act_as((select a from _f));
update public.profiles set xp = 99999, level = 50, strikes = 0, is_admin = true, banned_at = null
  where id = (select a from _f);
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select xp < 99999 and not is_admin from public.profiles where id = (select a from _f)),
  'guardas_perfil: xp e is_admin no cambian por la API');

-- guardas_local: el dueño no puede darse plan ni devolverse el permiso de Comunidad.
select set_config('app.elpoint_privileged', 'on', true);
update public.restaurants set community_banned_at = now(), community_removals = 3
  where id = (select resto from _f);
select set_config('app.elpoint_privileged', 'off', true);
select pg_temp.act_as((select o from _f));
update public.restaurants
  set paid_until = now() + interval '10 years', community_banned_at = null, community_removals = 0
  where id = (select resto from _f);
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select paid_until < now() + interval '1 year' and community_banned_at is not null and community_removals = 3
   from public.restaurants where id = (select resto from _f)),
  'guardas_local: plan y veto de Comunidad no cambian por la API');

-- funciones_internas_siguen: el admin le devuelve el permiso (función interna).
select set_config('app.elpoint_privileged', 'on', true);
update public.profiles set is_admin = true where id = (select b from _f);
select set_config('app.elpoint_privileged', 'off', true);
select pg_temp.act_as((select b from _f));
select public.admin_restore_community((select resto from _f));
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select community_banned_at is null from public.restaurants where id = (select resto from _f)),
  'funciones_internas_siguen: admin_restore_community escribe');
select set_config('app.elpoint_privileged', 'on', true);
update public.profiles set is_admin = false where id = (select b from _f);
select set_config('app.elpoint_privileged', 'off', true);

-- create_post_mismo_cliente: dos llamadas con el mismo client_id dan el mismo post.
select pg_temp.act_as((select a from _f));
create temp table _p as
select public.create_post((select cid from _f), 'antojos', 'algo rico', null, 'Arepera Revisada', null, '{}') as p1,
       public.create_post((select cid from _f), 'antojos', 'algo rico', null, 'Arepera Revisada', null, '{}') as p2;
select pg_temp.as_admin_db();
select pg_temp.ok((select p1 = p2 from _p), 'create_post_mismo_cliente');

-- respuesta_fecha_servidor: no se puede mandar created_at desde la API.
do $$
begin
  perform pg_temp.act_as((select b from _f));
  insert into public.post_replies (post_id, author_id, body, created_at)
  values ((select p1 from _p), (select b from _f), 'hola', now() - interval '2 days');
  raise exception 'FAIL: created_at aceptado';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  raise notice 'ok: respuesta_fecha_servidor (%)', sqlerrm;
end $$;
select pg_temp.as_admin_db();

-- dueño_responde_por_sugerencia: la sugerencia dada de alta con su local cuenta como mención.
insert into public.local_suggestions (normalized_name, status, restaurant_id)
values ('arepera revisada', 'alta', (select resto from _f))
on conflict (normalized_name) do update set status = 'alta', restaurant_id = excluded.restaurant_id;
select pg_temp.act_as((select o from _f));
insert into public.post_replies (post_id, author_id, as_restaurant_id, body)
values ((select p1 from _p), (select o from _f), (select resto from _f), 'Gracias por venir');
select pg_temp.as_admin_db();
select pg_temp.ok(
  exists (select 1 from public.post_replies where post_id = (select p1 from _p) and as_restaurant_id = (select resto from _f)),
  'dueño_responde_por_sugerencia');

-- bloqueo_sin_aviso: si A bloqueó a B, el me gusta de B no le avisa a A.
insert into public.user_blocks (blocker_id, blocked_id) select a, b from _f;
delete from public.notifications where recipient_id = (select a from _f);
select pg_temp.act_as((select b from _f));
insert into public.post_likes (user_id, post_id) select b, (select p1 from _p) from _f;
select pg_temp.as_admin_db();
select pg_temp.ok(
  not exists (select 1 from public.notifications where recipient_id = (select a from _f) and type in ('post_like', 'post_reply')),
  'bloqueo_sin_aviso');

-- like_post_retirado_sin_xp: un me gusta a un post retirado no da XP.
delete from public.user_blocks where blocker_id = (select a from _f);
select set_config('app.elpoint_privileged', 'on', true);
update public.posts set moderation = 'removed' where id = (select p1 from _p);
select set_config('app.elpoint_privileged', 'off', true);
delete from public.post_likes where post_id = (select p1 from _p);
create temp table _x as select xp from public.profiles where id = (select a from _f);
select pg_temp.act_as((select b from _f));
insert into public.post_likes (user_id, post_id) select b, (select p1 from _p) from _f;
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select xp from public.profiles where id = (select a from _f)) = (select xp from _x),
  'like_post_retirado_sin_xp');

drop table _f, _p, _x;
