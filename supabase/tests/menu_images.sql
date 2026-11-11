-- Menú en imágenes (migración 20261112010000).

create temp table _m as
select pg_temp.new_user('Dueño M', 'restaurant_owner') as own,
       pg_temp.new_user('Otro dueño M', 'restaurant_owner') as own2,
       pg_temp.new_user('Comensal M') as cus,
       gen_random_uuid() as rid,       -- con plan
       gen_random_uuid() as rid_free;  -- sin plan
grant select on _m to anon, authenticated;

select pg_temp.as_admin_db();
insert into public.restaurants (id, owner_id, name, status, is_active, location, paid_until)
values ((select rid from _m), (select own from _m), 'Local con plan M', 'approved', true,
        st_point(-71.50000, 8.50000)::geography, now() + interval '30 days'),
       ((select rid_free from _m), (select own2 from _m), 'Local sin plan M', 'approved', true,
        st_point(-71.50100, 8.50100)::geography, null);

-- Que el local "sin plan" no reciba Original ni prueba por ningún disparador.
select set_config('app.elpoint_privileged', 'on', true);
update public.restaurants set founder_rank = null, paid_until = null where id = (select rid_free from _m);
update public.restaurants set founder_rank = null, paid_until = now() + interval '30 days' where id = (select rid from _m);
select set_config('app.elpoint_privileged', 'off', true);
select pg_temp.ok(
  public.restaurant_has_plan((select rid from _m)) and not public.restaurant_has_plan((select rid_free from _m)),
  'preparacion: uno con plan y otro sin plan');

-- dueño_agrega_con_plan
select pg_temp.act_as((select own from _m));
insert into public.restaurant_menu_images (restaurant_id, storage_path, url, position)
values ((select rid from _m), (select rid from _m) || '/menu-pages/a.jpg', 'https://x.test/a.jpg', 0);
select pg_temp.as_admin_db();
select pg_temp.ok((select count(*) = 1 from public.restaurant_menu_images where restaurant_id = (select rid from _m)), 'dueño_agrega_con_plan');

-- sin_plan_no_agrega
select pg_temp.act_as((select own2 from _m));
do $$
begin
  insert into public.restaurant_menu_images (restaurant_id, storage_path, url, position)
  values ((select rid_free from _m), 'x/menu-pages/b.jpg', 'https://x.test/b.jpg', 0);
  raise exception 'FAIL: sin_plan_no_agrega';
exception when insufficient_privilege or sqlstate '42501' then
  null;
end $$;
select pg_temp.ok(true, 'sin_plan_no_agrega');

-- otro_dueño_no_agrega_en_local_ajeno
select pg_temp.act_as((select own2 from _m));
do $$
begin
  insert into public.restaurant_menu_images (restaurant_id, storage_path, url, position)
  values ((select rid from _m), 'x/menu-pages/c.jpg', 'https://x.test/c.jpg', 1);
  raise exception 'FAIL: otro_dueño_no_agrega_en_local_ajeno';
exception when insufficient_privilege or sqlstate '42501' then
  null;
end $$;
select pg_temp.ok(true, 'otro_dueño_no_agrega_en_local_ajeno');

-- tope_de_10
select pg_temp.act_as((select own from _m));
insert into public.restaurant_menu_images (restaurant_id, storage_path, url, position)
select (select rid from _m), 'x/menu-pages/' || g || '.jpg', 'https://x.test/' || g || '.jpg', g
from generate_series(1, 9) g;
select pg_temp.as_admin_db();
select pg_temp.ok((select count(*) = 10 from public.restaurant_menu_images where restaurant_id = (select rid from _m)), 'tope_de_10: llega a 10');
select pg_temp.act_as((select own from _m));
do $$
begin
  insert into public.restaurant_menu_images (restaurant_id, storage_path, url, position)
  values ((select rid from _m), 'x/menu-pages/once.jpg', 'https://x.test/once.jpg', 10);
  raise exception 'FAIL: tope_de_10';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
  if sqlerrm not like 'menu_images_limit%' then raise; end if;
end $$;
select pg_temp.ok(true, 'tope_de_10: la 11 se rechaza');

-- no_gasta_la_galeria
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select count(*) = 0 from public.restaurant_photos where restaurant_id = (select rid from _m)),
  'no_gasta_la_galeria: la galería sigue vacía');
select pg_temp.act_as((select own from _m));
insert into public.restaurant_photos (restaurant_id, storage_path, url, position)
values ((select rid from _m), 'x/gallery/g.jpg', 'https://x.test/g.jpg', 0);
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select count(*) = 1 from public.restaurant_photos where restaurant_id = (select rid from _m)),
  'no_gasta_la_galeria: el dueño aún puede subir fotos con 10 menús');

-- comensal_ve_con_plan_y_no_sin_plan
select pg_temp.act_as((select cus from _m));
select pg_temp.ok((select count(*) = 10 from public.restaurant_menu_images where restaurant_id = (select rid from _m)), 'comensal_ve_con_plan: 10');
select pg_temp.as_admin_db();
insert into public.restaurant_menu_images (restaurant_id, storage_path, url, position)
values ((select rid_free from _m), 'x/menu-pages/f.jpg', 'https://x.test/f.jpg', 0);
select pg_temp.act_as((select cus from _m));
select pg_temp.ok((select count(*) = 0 from public.restaurant_menu_images where restaurant_id = (select rid_free from _m)), 'comensal_no_ve_sin_plan');
select pg_temp.as_admin_db();
set local role anon;
select pg_temp.ok((select count(*) = 10 from public.restaurant_menu_images where restaurant_id = (select rid from _m)), 'visitante_ve_con_plan: 10');
reset role;

-- dueño_borra_y_reordena
select pg_temp.act_as((select own from _m));
update public.restaurant_menu_images set position = 99 where restaurant_id = (select rid from _m) and storage_path = (select rid from _m) || '/menu-pages/a.jpg';
delete from public.restaurant_menu_images where restaurant_id = (select rid from _m) and position = 1;
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select count(*) = 9 from public.restaurant_menu_images where restaurant_id = (select rid from _m)),
  'dueño_borra: queda 9');
select pg_temp.ok(
  (select position = 99 from public.restaurant_menu_images where storage_path = (select rid from _m) || '/menu-pages/a.jpg'),
  'dueño_reordena');
select pg_temp.act_as((select own from _m));
insert into public.restaurant_menu_images (restaurant_id, storage_path, url, position)
values ((select rid from _m), 'x/menu-pages/nueva.jpg', 'https://x.test/nueva.jpg', 100);
select pg_temp.as_admin_db();
select pg_temp.ok((select count(*) = 10 from public.restaurant_menu_images where restaurant_id = (select rid from _m)), 'liberar_un_lugar_permite_otra');

-- otro_dueño_no_borra_ni_cambia
select pg_temp.act_as((select own2 from _m));
delete from public.restaurant_menu_images where restaurant_id = (select rid from _m);
update public.restaurant_menu_images set position = 0 where restaurant_id = (select rid from _m);
select pg_temp.as_admin_db();
select pg_temp.ok((select count(*) = 10 from public.restaurant_menu_images where restaurant_id = (select rid from _m)), 'otro_dueño_no_borra');

-- borrar el local borra sus imágenes
delete from public.restaurants where id = (select rid from _m);
select pg_temp.ok(not exists (select 1 from public.restaurant_menu_images where restaurant_id = (select rid from _m)), 'cascada_al_borrar_el_local');
