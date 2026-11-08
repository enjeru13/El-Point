-- Instalaciones y uso de la app (migración 20261108000000).

create temp table _a as
select pg_temp.new_user('Cliente A') as cli,
       pg_temp.new_user('Admin A') as adm,
       gen_random_uuid() as ins1,
       gen_random_uuid() as ins2,
       gen_random_uuid() as ins3;
grant select on _a to anon, authenticated;

select set_config('app.elpoint_privileged', 'on', true);
update public.profiles set is_admin = true where id = (select adm from _a);
select set_config('app.elpoint_privileged', 'off', true);

-- anon_heartbeat: sin cuenta se registra la instalación, sin usuario.
select set_config('role', 'anon', true);
select public.app_heartbeat((select ins1 from _a), 'android', '1.1.0');
select public.app_heartbeat((select ins1 from _a), 'android', '1.1.0');
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select user_id is null and platform = 'android' from public.app_installs where install_id = (select ins1 from _a)),
  'anon_heartbeat: instalación sin cuenta');
select pg_temp.ok(
  (select count(*) = 1 from public.app_install_days where install_id = (select ins1 from _a)),
  'anon_heartbeat: un solo registro por día');

-- login_links_user: al iniciar sesión queda la cuenta; al salir no se pierde.
select pg_temp.act_as((select cli from _a));
select public.app_heartbeat((select ins1 from _a), 'android', '1.1.1');
select pg_temp.as_admin_db();
select set_config('role', 'anon', true);
select public.app_heartbeat((select ins1 from _a), 'android', '1.1.1');
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select user_id = (select cli from _a) and app_version = '1.1.1' from public.app_installs where install_id = (select ins1 from _a)),
  'login_links_user: guarda la cuenta y la versión nueva');

-- invalid_input
do $$
begin
  perform set_config('role', 'anon', true);
  perform public.app_heartbeat((select ins2 from _a), 'windows', '1.0');
  raise exception 'FAIL: invalid_input: aceptó una plataforma inválida';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  perform pg_temp.as_admin_db();
  raise notice 'ok: invalid_input: plataforma inválida rechazada';
end $$;
select pg_temp.as_admin_db();

-- no_direct_read: las tablas no se leen directo.
do $$
begin
  perform pg_temp.act_as((select cli from _a));
  perform count(*) from public.app_installs;
  raise exception 'FAIL: no_direct_read: un cliente leyó app_installs';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  perform pg_temp.as_admin_db();
  raise notice 'ok: no_direct_read: tabla cerrada';
end $$;
select pg_temp.as_admin_db();

-- admin_usage: totales por plataforma y serie diaria.
select set_config('role', 'anon', true);
select public.app_heartbeat((select ins2 from _a), 'ios', '1.0.0');
select public.app_heartbeat((select ins3 from _a), 'ios', '1.0.0');
select pg_temp.as_admin_db();
select pg_temp.act_as((select adm from _a));
create temp table _u as select public.admin_app_usage(7) as j;
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select (j->'installs'->>'ios')::int >= 2 and (j->'installs'->>'android')::int >= 1 from _u),
  'admin_usage: cuenta instalaciones por plataforma');
select pg_temp.ok(
  (select jsonb_array_length(j->'daily') = 7 from _u),
  'admin_usage: serie de 7 días');
select pg_temp.ok(
  (select (j->'daily'->6->>'active_ios')::int >= 2 from _u),
  'admin_usage: activos de hoy en iOS');

-- admin_only
do $$
begin
  perform pg_temp.act_as((select cli from _a));
  perform public.admin_app_usage(7);
  raise exception 'FAIL: admin_only: un cliente vio las estadísticas';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  perform pg_temp.as_admin_db();
  raise notice 'ok: admin_only: solo admin';
end $$;
select pg_temp.as_admin_db();

-- public_count_hidden: con menos de 500 no se muestra.
select pg_temp.ok(
  (select count(*) < 500 from public.app_installs) = (public.public_install_count() is null),
  'public_count_hidden: oculto bajo 500');
