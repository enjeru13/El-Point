-- Categorías de la 1.2 (migración 20261112030000).
select pg_temp.ok(
  (select label = 'Pasteles y empanadas' from public.categories where id = 27 and slug = 'pasteles'),
  'pasteles_y_empanadas');
select pg_temp.ok(
  (select label = 'Cachapas' and icon = 'mdi:cheese' and sort_order = 22 from public.categories where slug = 'cachapas'),
  'cachapas_nueva');
select pg_temp.ok((select count(*) = 26 from public.categories), 'total_26_categorias');
-- Visible para quien no tiene cuenta (las categorías se leen sin sesión).
set local role anon;
select pg_temp.ok(exists (select 1 from public.categories where slug = 'cachapas'), 'visitante_ve_cachapas');
reset role;
