-- Comunidad: locales sugeridos (migración 20261105010500).

create temp table _g as
select pg_temp.new_user('Primera') as a,
       pg_temp.new_user('Segundo') as b,
       pg_temp.new_user('Admin') as adm,
       gen_random_uuid() as resto;
grant select on _g to authenticated;

insert into public.restaurants (id, name, status, is_active)
select resto, 'Fogón Sug', 'approved', true from _g;

select set_config('app.elpoint_privileged', 'on', true);
update public.profiles set is_admin = true where id = (select adm from _g);
select set_config('app.elpoint_privileged', 'off', true);

insert into public.posts (author_id, topic, body, suggested_name, client_id, created_at)
select a, 'locales_nuevos', 'lo descubrí', 'Restaurante El Fogón Sug', gen_random_uuid(), now() - interval '3 min' from _g
union all
select b, 'locales_nuevos', 'buenísimo', 'el fogon sug', gen_random_uuid(), now() - interval '2 min' from _g
union all
select b, 'locales_nuevos', 'vayan', 'FOGÓN SUG', gen_random_uuid(), now() - interval '1 min' from _g;
insert into public.local_suggestions (normalized_name) values ('fogon sug');

create function pg_temp.xp(p uuid) returns int language sql as
  $$ select xp from public.profiles where id = p $$;

create function pg_temp.set_status(p_status text) returns void language plpgsql as $$
begin
  perform pg_temp.act_as((select adm from _g));
  perform public.set_local_suggestion_status('fogon sug', p_status, (select resto from _g));
  perform pg_temp.as_admin_db();
end $$;

-- suggestion_grouping
select pg_temp.act_as((select adm from _g));
select pg_temp.ok(
  (select post_count from public.admin_local_suggestions() where normalized_name = 'fogon sug') = 3,
  'suggestion_grouping: 3 posts en una sugerencia');
select pg_temp.as_admin_db();

-- alta_premia_primero: +25 y +50 de misión a la primera, nada al segundo.
create temp table _x0 as select pg_temp.xp((select a from _g)) as a0, pg_temp.xp((select b from _g)) as b0;
select pg_temp.set_status('alta');
select pg_temp.ok(pg_temp.xp((select a from _g)) = (select a0 from _x0) + 75, 'alta_premia_primero');
select pg_temp.ok(pg_temp.xp((select b from _g)) = (select b0 from _x0), 'el segundo no gana');
select pg_temp.ok(
  exists (select 1 from public.user_missions where user_id = (select a from _g) and mission = 'brought_local'),
  'misión brought_local concedida');

-- alta_dos_veces_no_repite
select pg_temp.set_status('contactado');
select pg_temp.set_status('alta');
select pg_temp.ok(pg_temp.xp((select a from _g)) = (select a0 from _x0) + 75, 'alta_dos_veces_no_repite');

-- no_admin_forbidden
do $$
begin
  perform pg_temp.act_as((select a from _g));
  perform public.set_local_suggestion_status('fogon sug', 'descartado');
  raise exception 'FAIL: un no admin cambió una sugerencia';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  if sqlerrm <> 'forbidden' then raise exception 'FAIL: no_admin_forbidden (%)', sqlerrm; end if;
  raise notice 'ok: no_admin_forbidden';
end $$;
select pg_temp.as_admin_db();

-- admin_restore_community
select set_config('app.elpoint_privileged', 'on', true);
update public.restaurants set community_banned_at = now(), community_removals = 3 where id = (select resto from _g);
select set_config('app.elpoint_privileged', 'off', true);
select pg_temp.act_as((select adm from _g));
select public.admin_restore_community((select resto from _g));
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select community_banned_at is null and community_removals = 0 from public.restaurants where id = (select resto from _g)),
  'admin_restore_community');

drop table _g, _x0;
