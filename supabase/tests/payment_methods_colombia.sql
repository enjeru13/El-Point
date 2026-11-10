-- Bancolombia y Nequi en el catálogo (migración 20261111060000).
set local role anon;
select pg_temp.ok(
  (select count(*) = 2 from public.payment_methods where slug in ('bancolombia', 'nequi')),
  'metodos_colombia_visibles');
reset role;
