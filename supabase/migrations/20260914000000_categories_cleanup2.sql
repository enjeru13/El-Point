-- Segunda ronda de limpieza de categorías, sobre lo que dejó
-- 20260912120000_categories_cleanup.sql (esa migración puede no estar
-- pusheada todavía -- esta no depende de que lo esté; ids que ya no
-- existan ahí simplemente no matchean nada acá, sin error).

-- ─── 1. "Comida rápida" se elimina -- sin categoría de reemplazo ──────────
delete from public.restaurant_categories where category_id = 12;

update public.profiles
  set favorite_categories = array_remove(favorite_categories, 12::smallint)
  where 12 = any(favorite_categories);

delete from public.categories where id = 12;

-- ─── 2. Ícono de "Mariscos" -- compartía el mismo pez que Sushi ──────────
update public.categories set icon = 'mdi:shrimp' where id = 11;

-- ─── 3. "Comida criolla" -> "Almuerzos" (mismo concepto, mismo id) ───────
update public.categories set label = 'Almuerzos' where id = 24;

-- ─── 3b. "Pollo en brasa" -> "Pollo asado / broaster" (con "/", como el
--   resto de las categorías combo -- ver "Bar / tasca") ─────────────────
update public.categories set label = 'Pollo asado / broaster' where id = 15;

-- ─── 3c. "Carnes" se elimina -- sin categoría de reemplazo ───────────────
delete from public.restaurant_categories where category_id = 16;

update public.profiles
  set favorite_categories = array_remove(favorite_categories, 16::smallint)
  where 16 = any(favorite_categories);

delete from public.categories where id = 16;

-- ─── 4. "Desayunos / pastelitos"(26) se funde en "Pasteles"(27) ─────────
--   -- un pastelito de desayuno y una empanada son lo bastante parecidos
--   -- para el usuario que ambas etiquetas por separado eran redundantes.
--   Sobrevive el id 27, renombrado a "Empanadas".
delete from public.restaurant_categories rc
using public.restaurant_categories rc2
where rc.category_id = 26
  and rc2.restaurant_id = rc.restaurant_id
  and rc2.category_id = 27;

update public.restaurant_categories
  set category_id = 27
  where category_id = 26;

update public.profiles
  set favorite_categories = (
    select array_agg(distinct x)
    from unnest(
      array(
        select (case when v = 26 then 27 else v end)::smallint
        from unnest(favorite_categories) as v
      )
    ) as x
  )
  where 26 = any(favorite_categories);

delete from public.categories where id = 26;

update public.categories set label = 'Empanadas' where id = 27;
