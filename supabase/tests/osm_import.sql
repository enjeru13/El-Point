-- Locales importados de OSM (migración 20261109000000).

-- imported: 68 locales, aprobados, sin dueño, sin plan ni Original.
select pg_temp.ok(
  (select count(*) = 68 from public.restaurants where osm_id is not null),
  'imported: 68 locales');
select pg_temp.ok(
  not exists (
    select 1 from public.restaurants
    where osm_id is not null
      and (owner_id is not null or founder_rank is not null or paid_until is not null
           or boost_until is not null or status <> 'approved' or not is_active
           or location is null or latitude is null)
  ),
  'imported: aprobados, sin dueño, sin Original, sin plan, con ubicación');
select pg_temp.ok(
  not exists (
    select 1 from public.restaurants r
    where r.osm_id is not null
      and not exists (select 1 from public.restaurant_categories rc where rc.restaurant_id = r.id)
  ),
  'imported: todos con al menos una categoría');
select pg_temp.ok(
  not public.restaurant_has_plan((select id from public.restaurants where osm_id = 'node/2547879121')),
  'imported: perfil básico (sin plan)');

-- visible: anon los ve en el mapa.
select set_config('role', 'anon', true);
select pg_temp.ok(
  (select count(*) >= 68 from public.restaurants where osm_id is not null),
  'visible: anon los lee');
select pg_temp.ok(
  exists (select 1 from public.nearby_restaurants(7.7745, -72.2189, 10, null) n
          join public.restaurants r on r.id = n.id where r.osm_id is not null),
  'visible: salen en nearby_restaurants');
select pg_temp.as_admin_db();

-- reapprove_ownerless: suspender y volver a aprobar no regala nada.
update public.restaurants set status = 'suspended' where osm_id = 'node/2547879121';
update public.restaurants set status = 'approved' where osm_id = 'node/2547879121';
select pg_temp.ok(
  (select founder_rank is null and paid_until is null and boost_until is null
   from public.restaurants where osm_id = 'node/2547879121'),
  'reapprove_ownerless: sin Original, prueba ni Destacado');

-- owned_still_rewarded: un local con dueño sigue recibiendo todo al aprobarse.
create temp table _o as select pg_temp.new_user('Dueño O', 'restaurant_owner') as own;
insert into public.restaurants (owner_id, name, status)
values ((select own from _o), 'Local con dueño', 'pending');
update public.restaurants set status = 'approved' where owner_id = (select own from _o);
select pg_temp.ok(
  (select (founder_rank is not null or paid_until is not null) and boost_until is not null
   from public.restaurants where owner_id = (select own from _o)),
  'owned_still_rewarded: Original o prueba, y Destacado al aprobar');

-- no_duplicates: osm_id único.
do $$
begin
  insert into public.restaurants (osm_id, name, status) values ('node/2547879121', 'Dup', 'approved');
  raise exception 'FAIL: no_duplicates';
exception when unique_violation then
  null;
end $$;
select pg_temp.ok(true, 'no_duplicates: osm_id único');
