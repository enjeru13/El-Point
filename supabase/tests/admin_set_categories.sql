-- Categorías por el admin (migración 20261109010000).

create temp table _c as
select pg_temp.new_user('Admin C') as adm,
       pg_temp.new_user('Cliente C') as cli,
       gen_random_uuid() as rid;
grant select on _c to anon, authenticated;

select set_config('app.elpoint_privileged', 'on', true);
update public.profiles set is_admin = true where id = (select adm from _c);
select set_config('app.elpoint_privileged', 'off', true);

insert into public.restaurants (id, name, status)
values ((select rid from _c), 'Local sin dueño C', 'approved');
insert into public.restaurant_categories (restaurant_id, category_id)
values ((select rid from _c), 2);

-- admin_sets: reemplaza las categorías y deja registro.
select pg_temp.act_as((select adm from _c));
select public.admin_set_restaurant_categories((select rid from _c), array[17, 1, 17]::smallint[]);
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select array_agg(category_id order by category_id) = array[1, 17]::smallint[]
   from public.restaurant_categories where restaurant_id = (select rid from _c)),
  'admin_sets: quedan solo las elegidas, sin duplicados');
select pg_temp.ok(
  exists (select 1 from public.admin_audit_log
          where restaurant_id = (select rid from _c) and action = 'set_categories'
            and admin_id = (select adm from _c)),
  'admin_sets: queda en el historial');

-- limits: 0 o más de 3, o una categoría que no existe.
select pg_temp.act_as((select adm from _c));
do $$
begin
  perform public.admin_set_restaurant_categories((select rid from _c), '{}'::smallint[]);
  raise exception 'FAIL: limits vacío';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
do $$
begin
  perform public.admin_set_restaurant_categories((select rid from _c), array[1, 2, 3, 7]::smallint[]);
  raise exception 'FAIL: limits más de 3';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
do $$
begin
  perform public.admin_set_restaurant_categories((select rid from _c), array[12]::smallint[]);
  raise exception 'FAIL: limits categoría inexistente';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select count(*) = 2 from public.restaurant_categories where restaurant_id = (select rid from _c)),
  'limits: los intentos inválidos no cambian nada');

-- admin_only: un cliente no puede.
select pg_temp.act_as((select cli from _c));
do $$
begin
  perform public.admin_set_restaurant_categories((select rid from _c), array[3]::smallint[]);
  raise exception 'FAIL: admin_only';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select pg_temp.as_admin_db();
select pg_temp.ok(true, 'admin_only: un cliente no puede cambiarlas');
