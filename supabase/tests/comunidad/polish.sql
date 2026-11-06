-- Detalles de la revisión final (migración 20261105040000).

create temp table _q as
select pg_temp.new_user('Autora Q') as a,
       pg_temp.new_user('Otro Q') as b;
grant select on _q to authenticated;

-- normaliza_puntuacion
select pg_temp.ok(
  public.normalize_place_name('Pollos D''Arturo') = public.normalize_place_name('Pollos DArturo'),
  'normaliza_puntuacion: apóstrofo');
select pg_temp.ok(
  public.normalize_place_name('Restaurante El Fogón de Mamá.') = 'fogon de mama',
  'normaliza_puntuacion: punto final');

create function pg_temp.post_by(p_user uuid) returns uuid language plpgsql as $$
declare v uuid;
begin
  perform pg_temp.act_as(p_user);
  v := public.create_post(gen_random_uuid(), 'antojos', 'post de prueba', null, 'Sitio Q', null, '{}');
  perform pg_temp.as_admin_db();
  return v;
end $$;

create temp table _qp as select pg_temp.post_by((select a from _q)) as p;

-- contador_solo_visibles: 2 respuestas, se oculta una, el contador dice 1.
select pg_temp.act_as((select b from _q));
insert into public.post_replies (post_id, author_id, body) select p, (select b from _q), 'uno' from _qp;
insert into public.post_replies (post_id, author_id, body) select p, (select b from _q), 'dos' from _qp;
select pg_temp.as_admin_db();
select set_config('app.elpoint_privileged', 'on', true);
update public.post_replies set moderation = 'hidden'
  where id = (select id from public.post_replies where post_id = (select p from _qp) and body = 'dos');
select set_config('app.elpoint_privileged', 'off', true);
select pg_temp.ok(
  (select reply_count from public.posts where id = (select p from _qp)) = 1,
  'contador_solo_visibles');

-- en_revision_no_se_borra: la autora no puede borrar su post oculto.
select set_config('app.elpoint_privileged', 'on', true);
update public.posts set moderation = 'hidden' where id = (select p from _qp);
select set_config('app.elpoint_privileged', 'off', true);
select pg_temp.act_as((select a from _q));
delete from public.posts where id = (select p from _qp);
select pg_temp.as_admin_db();
select pg_temp.ok(exists (select 1 from public.posts where id = (select p from _qp)), 'en_revision_no_se_borra');

-- aviso_al_retirar: retirar el post le avisa a la autora.
select set_config('app.elpoint_privileged', 'on', true);
update public.posts set moderation = 'removed' where id = (select p from _qp);
select set_config('app.elpoint_privileged', 'off', true);
select pg_temp.ok(
  exists (select 1 from public.notifications
          where recipient_id = (select a from _q) and type = 'moderation'
            and data ->> 'post_id' = (select p from _qp)::text),
  'aviso_al_retirar');

-- nivel_un_solo_aviso: subir, bajar y volver a subir al nivel 2 avisa una vez.
select public.award_xp((select b from _q), public.xp_for_level(2) - (select xp from public.profiles where id = (select b from _q)));
select public.award_xp((select b from _q), -1);
select public.award_xp((select b from _q), 1);
select pg_temp.ok(
  (select count(*) from public.notifications
   where recipient_id = (select b from _q) and type = 'levelup' and title like '¡Subiste al nivel 2!%') = 1,
  'nivel_un_solo_aviso');

-- fotos_solo_al_publicar: pasados 15 minutos ya no se agregan fotos.
create temp table _qo as select pg_temp.post_by((select a from _q)) as p;
update public.posts set created_at = now() - interval '20 minutes' where id = (select p from _qo);
do $$
begin
  perform pg_temp.act_as((select a from _q));
  insert into public.post_photos (post_id, position, storage_path)
  select p, 0, p::text || '/0' from _qo;
  raise exception 'FAIL: foto agregada tarde';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  raise notice 'ok: fotos_solo_al_publicar (%)', sqlerrm;
end $$;
select pg_temp.as_admin_db();

-- foto_en_su_carpeta: la ruta tiene que ser la del propio post.
create temp table _qn as select pg_temp.post_by((select a from _q)) as p;
do $$
begin
  perform pg_temp.act_as((select a from _q));
  insert into public.post_photos (post_id, position, storage_path)
  select p, 0, 'otro-post/0' from _qn;
  raise exception 'FAIL: ruta ajena aceptada';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  raise notice 'ok: foto_en_su_carpeta (%)', sqlerrm;
end $$;
select pg_temp.as_admin_db();

drop table _q, _qp, _qo, _qn;
