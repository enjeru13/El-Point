-- Aprobar desde el panel da Original y Destacado (migración 20261111050000).

create temp table _a as
select pg_temp.new_user('Admin A') as adm,
       pg_temp.new_user('Dueño A', 'restaurant_owner') as own,
       gen_random_uuid() as rid;
grant select on _a to anon, authenticated;

select set_config('app.elpoint_privileged', 'on', true);
update public.profiles set is_admin = true where id = (select adm from _a);
select set_config('app.elpoint_privileged', 'off', true);

insert into public.restaurants (id, owner_id, name, status, location)
values ((select rid from _a), (select own from _a), 'Local Aprobación A', 'pending',
        st_point(-71.50000, 8.50000)::geography);

-- Igual que el panel: UPDATE directo como admin.
select pg_temp.act_as((select adm from _a));
update public.restaurants set status = 'approved', reviewed_at = now() where id = (select rid from _a);
select pg_temp.as_admin_db();

select pg_temp.ok(
  (select (founder_rank is not null or paid_until is not null) and boost_until is not null
   from public.restaurants where id = (select rid from _a)),
  'aprobar_desde_panel: Original (o prueba) y Destacado');

-- El dueño sigue sin poder tocar esas columnas.
select pg_temp.act_as((select own from _a));
update public.restaurants set paid_until = now() + interval '10 years' where id = (select rid from _a);
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select paid_until is null or paid_until < now() + interval '1 year' from public.restaurants where id = (select rid from _a)),
  'dueno_no_toca_plan');
