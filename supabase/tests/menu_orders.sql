-- Fechas de tasas y costo de delivery (migración 20261110000000).

create temp table _m as select gen_random_uuid() as rid;
grant select on _m to anon, authenticated;

insert into public.restaurants (id, name, status, location)
values ((select rid from _m), 'Local tasas M', 'approved', st_point(-71.50000, 8.50000)::geography);

-- rate_fecha_al_cambiar
update public.restaurants set menu_bs_rate = 1000 where id = (select rid from _m);
select pg_temp.ok(
  (select menu_bs_rate_updated_at >= now() - interval '1 minute' from public.restaurants where id = (select rid from _m)),
  'rate_fecha_al_cambiar');

-- rate_fecha_igual_si_no_cambia
update public.restaurants set menu_bs_rate_updated_at = '2026-01-01' where id = (select rid from _m);
update public.restaurants set name = 'Local tasas M2' where id = (select rid from _m);
select pg_temp.ok(
  (select menu_bs_rate_updated_at = '2026-01-01'::timestamptz from public.restaurants where id = (select rid from _m)),
  'rate_fecha_igual_si_no_cambia');

-- rate_fecha_null_al_quitar (bs y cop)
update public.restaurants set menu_cop_rate = 3200 where id = (select rid from _m);
select pg_temp.ok(
  (select menu_cop_rate_updated_at is not null from public.restaurants where id = (select rid from _m)),
  'rate_fecha_cop_al_cambiar');
update public.restaurants set menu_bs_rate = null, menu_cop_rate = null where id = (select rid from _m);
select pg_temp.ok(
  (select menu_bs_rate_updated_at is null and menu_cop_rate_updated_at is null
   from public.restaurants where id = (select rid from _m)),
  'rate_fecha_null_al_quitar');

-- delivery_check
do $$
begin
  update public.restaurants set delivery_fee_mode = 'otro' where id = (select rid from _m);
  raise exception 'FAIL: delivery_fee_mode acepta otro';
exception when check_violation then null;
end $$;
do $$
begin
  update public.restaurants set delivery_fee = 0 where id = (select rid from _m);
  raise exception 'FAIL: delivery_fee acepta 0';
exception when check_violation then null;
end $$;
update public.restaurants set delivery_fee_mode = 'fixed', delivery_fee = 1.5 where id = (select rid from _m);
select pg_temp.ok(true, 'delivery_check');

-- anon_lee_columnas
set local role anon;
select pg_temp.ok(
  (select count(*) >= 0 from (
     select delivery_fee_mode, delivery_fee, menu_bs_rate_updated_at, menu_cop_rate_updated_at
     from public.restaurants limit 1) x),
  'anon_lee_columnas');
reset role;
