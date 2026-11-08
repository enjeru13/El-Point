-- Duplicados (migración 20261109030000).

create temp table _d as
select pg_temp.new_user('Admin D') as adm,
       pg_temp.new_user('Dueño D', 'restaurant_owner') as own,
       pg_temp.new_user('Cliente D') as cli,
       pg_temp.new_user('Reclamante D') as rec,
       gen_random_uuid() as old_id,
       gen_random_uuid() as far_id,
       gen_random_uuid() as new_id;
grant select on _d to anon, authenticated;

select set_config('app.elpoint_privileged', 'on', true);
update public.profiles set is_admin = true where id = (select adm from _d);
select set_config('app.elpoint_privileged', 'off', true);

-- Un importado en Barrio Obrero y otro lejos con el mismo nombre.
insert into public.restaurants (id, name, status, location) values
  ((select old_id from _d), 'Pizzería El Punto', 'approved', st_point(-71.50000, 8.50000)::geography),
  ((select far_id from _d), 'Pizzas El Punto', 'approved', st_point(-71.52000, 8.48000)::geography);

-- core_name
select pg_temp.ok(public.locale_core_name('Pizzería El Punto') = 'punto', 'core_name: quita tildes y genéricos');

-- matches: nombre parecido cerca sí; lejos no; nombre distinto a 100 m no.
set local role anon;
select pg_temp.ok(
  (select array_agg(id) = array[(select old_id from _d)] from public.find_claimable_matches('Pizzas el punto', 8.50030, -71.50020)),
  'matches: encuentra el parecido cercano y no el lejano');
select pg_temp.ok(
  not exists (select 1 from public.find_claimable_matches('Sushi Koi', 8.50090, -71.50000)),
  'matches: nombre distinto a 100 m no cuenta');
select pg_temp.ok(
  exists (select 1 from public.find_claimable_matches('Otro nombre', 8.50010, -71.50000)),
  'matches: casi en el mismo punto cuenta aunque el nombre cambie');
reset role;

-- Datos del importado: una reseña, un favorito y un reclamo pendiente.
insert into public.reviews (restaurant_id, author_id, rating, body)
values ((select old_id from _d), (select cli from _d), 5, 'Muy buena la pizza de aquí');
insert into public.favorites (user_id, restaurant_id) values ((select cli from _d), (select old_id from _d));
select pg_temp.act_as((select rec from _d));
select public.submit_restaurant_claim((select old_id from _d), 'Reclamante D', '04141234567', null,
  (select rec from _d)::text || '/claims/x.jpg');
select pg_temp.as_admin_db();

-- El dueño registra el mismo local como nuevo.
insert into public.restaurants (id, owner_id, name, status, location) values
  ((select new_id from _d), (select own from _d), 'Pizzas El Punto', 'pending', st_point(-71.50010, 8.50010)::geography);

-- merge
select pg_temp.act_as((select adm from _d));
select public.admin_merge_duplicate((select new_id from _d), (select old_id from _d));
select pg_temp.as_admin_db();
select pg_temp.ok(
  not exists (select 1 from public.restaurants where id = (select old_id from _d)),
  'merge: el importado se borra');
select pg_temp.ok(
  (select status = 'approved' and rating_count = 1 and boost_until is not null
   from public.restaurants where id = (select new_id from _d)),
  'merge: el nuevo queda aprobado con la reseña y su Destacado');
select pg_temp.ok(
  exists (select 1 from public.favorites where restaurant_id = (select new_id from _d) and user_id = (select cli from _d)),
  'merge: el favorito pasa al nuevo');
select pg_temp.ok(
  exists (select 1 from public.notifications where recipient_id = (select rec from _d) and data->>'kind' = 'claim_rejected'),
  'merge: avisa a quien lo había reclamado');

-- merge_rules: un cliente no puede; no se une con un local que ya tiene dueño.
select pg_temp.act_as((select cli from _d));
do $$
begin
  perform public.admin_merge_duplicate((select new_id from _d), (select far_id from _d));
  raise exception 'FAIL: merge_rules cliente';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
select pg_temp.as_admin_db();
select pg_temp.ok(true, 'merge_rules: solo admin');
