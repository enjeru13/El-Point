-- Segunda pasada sobre el catálogo de categorías: nombres largos acortados
-- y 3 categorías muy nicho fundidas en categorías más generales que ya
-- existían. "Pasteles" (empanadas) y "Desayunos / pastelitos" NO se tocan
-- -- son conceptos reales y distintos en Táchira, no bakery genérico.

-- ─── 1. Nombres más cortos (mismo concepto, mismo id) ──────────────────────

update public.categories set label = 'Vegetariano'        where id = 5;   -- vegan
update public.categories set label = 'Pollo en brasa'     where id = 15;  -- chicken
update public.categories set label = 'Comida criolla'     where id = 24;  -- criolla
update public.categories set label = 'Panadería'          where id = 28;  -- bakery
update public.categories set label = 'Shawarma'           where id = 20;  -- shawarma

-- ─── 2. Fusiones ────────────────────────────────────────────────────────────
--   ramen(21) + chinese(22) -> asian(23) "Comida asiática"
--   waffles(29) + churros(30) + froyo(33) -> desserts(7) "Postres y heladería"

-- restaurant_categories: PK es (restaurant_id, category_id) -- si un local
-- ya tiene la categoría destino, hay que borrar la fuente en vez de
-- actualizarla (si no, choca contra la PK).
delete from public.restaurant_categories rc
using public.restaurant_categories rc2
where rc.category_id = any(array[21, 22]::smallint[])
  and rc2.restaurant_id = rc.restaurant_id
  and rc2.category_id = 23;

update public.restaurant_categories
  set category_id = 23
  where category_id = any(array[21, 22]::smallint[]);

delete from public.restaurant_categories rc
using public.restaurant_categories rc2
where rc.category_id = any(array[29, 30, 33]::smallint[])
  and rc2.restaurant_id = rc.restaurant_id
  and rc2.category_id = 7;

update public.restaurant_categories
  set category_id = 7
  where category_id = any(array[29, 30, 33]::smallint[]);

-- profiles.favorite_categories (smallint[]): remapear cada elemento y
-- des-duplicar el arreglo resultante.
update public.profiles
  set favorite_categories = (
    select array_agg(distinct x)
    from unnest(
      array(
        select (case
          when v = any(array[21, 22]::smallint[]) then 23
          when v = any(array[29, 30, 33]::smallint[]) then 7
          else v
        end)::smallint
        from unnest(favorite_categories) as v
      )
    ) as x
  )
  where favorite_categories && array[21, 22, 29, 30, 33]::smallint[];

-- Ya reasignado todo lo que dependía de estos ids -- borrarlos.
delete from public.categories where id in (21, 22, 29, 30, 33);
