-- Comunidad: esquema base (migración 20261105010000).

select pg_temp.ok(
  public.normalize_place_name('Restaurante El Fogón  de Mamá') = 'fogon de mama',
  'normaliza "Restaurante El Fogón  de Mamá"'
);
select pg_temp.ok(
  public.normalize_place_name('FOGÓN DE MAMA') = 'fogon de mama',
  'normaliza "FOGÓN DE MAMA"'
);
select pg_temp.ok(public.normalize_place_name('  ') is null, 'nombre vacío da null');

select pg_temp.ok(
  (select count(*) = 1 and bool_and(owner_posts_enabled) from public.app_settings),
  'app_settings tiene 1 fila encendida'
);

create temp table _s as
select pg_temp.new_user('Ana') as ana,
       (select id from public.restaurants where status = 'approved' and is_active limit 1) as resto;
grant select on _s to authenticated;

-- Local y nombre sugerido a la vez: no.
do $$
begin
  insert into public.posts (author_id, topic, body, restaurant_id, suggested_name, client_id)
  select ana, 'antojos', 'hola', resto, 'Otro', gen_random_uuid() from _s;
  raise exception 'FAIL: local y sugerido a la vez debía fallar';
exception when check_violation then
  raise notice 'ok: local y sugerido a la vez da check_violation';
end $$;

-- Texto de 501 caracteres: no.
do $$
begin
  insert into public.posts (author_id, topic, body, client_id)
  select ana, 'antojos', repeat('a', 501), gen_random_uuid() from _s;
  raise exception 'FAIL: body de 501 debía fallar';
exception when check_violation then
  raise notice 'ok: body de 501 da check_violation';
end $$;

-- Como usuario normal: no inserta posts directo y no ve sugerencias.
insert into public.local_suggestions (normalized_name) values ('prueba sugerencia');

select pg_temp.act_as((select ana from _s));

do $$
begin
  insert into public.posts (author_id, topic, body, client_id)
  values ((select ana from _s), 'antojos', 'hola', gen_random_uuid());
  raise exception 'FAIL: insert directo en posts debía fallar';
exception when insufficient_privilege then
  raise notice 'ok: insert directo en posts da insufficient_privilege';
end $$;

select pg_temp.ok(
  (select count(*) from public.local_suggestions) = 0,
  'usuario normal no ve local_suggestions'
);

select pg_temp.as_admin_db();
drop table _s;
