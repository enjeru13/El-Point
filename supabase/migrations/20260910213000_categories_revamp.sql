-- Rework del catálogo de categorías para San Cristóbal / Táchira.
-- 33 categorías. Se conservan los ids 1..14 de las que ya existían (para no
-- romper restaurant_categories ni profiles.favorite_categories) y se les
-- ajusta label / icon / sort_order; los ids 15..33 son nuevos.
-- Iconos: nombres de MaterialCommunityIcons (Icon.tsx cae a MDI si no hay
-- match en lucide).

insert into public.categories (id, slug, label, icon, sort_order) values
  -- ── ids existentes (concepto conservado, etiqueta/orden nuevos) ──
  ( 1, 'pizza',      'Pizza',                        'mdi:pizza',            11),
  ( 2, 'burgers',    'Hamburguesas',                 'mdi:hamburger',         5),
  ( 3, 'sushi',      'Sushi',                        'mdi:fish',             14),
  ( 4, 'mexican',    'Comida mexicana',              'mdi:taco',             33),
  ( 5, 'vegan',      'Saludable / Vegetariano',      'mdi:sprout',           32),
  ( 6, 'coffee',     'Cafés',                        'mdi:coffee',           27),
  ( 7, 'desserts',   'Postres y heladería',          'mdi:ice-cream',        30),
  ( 8, 'finedining', 'Alta cocina',                  'mdi:chef-hat',         13),
  ( 9, 'bbq',        'Parrilla',                     'mdi:grill',             2),
  (10, 'pasta',      'Pasta',                        'mdi:pasta',            12),
  (11, 'seafood',    'Mariscos',                     'mdi:fish',             18),
  (12, 'fastfood',   'Comida rápida',                'mdi:food-variant',      7),
  (13, 'hotdogs',    'Perros calientes',             'mdi:food-hot-dog',      6),
  (14, 'arepas',     'Arepas',                       'mdi:corn',             19),
  -- ── nuevas ──
  (15, 'chicken',    'Pollo asado o broaster',       'mdi:food-drumstick',    1),
  (16, 'steak',      'Carnes',                       'mdi:food-steak',        3),
  (17, 'morcillas',  'Morcillas',                    'mdi:sausage',           4),
  (18, 'pepitos',    'Pepitos',                      'mdi:baguette',          8),
  (19, 'pinchos',    'Pinchos',                      'mdi:fire',              9),
  (20, 'shawarma',   'Shawarma / árabe',             'mdi:food',             10),
  (21, 'ramen',      'Ramen',                        'mdi:noodles',          15),
  (22, 'chinese',    'Arroz chino',                  'mdi:rice',             16),
  (23, 'asian',      'Comida asiática',              'mdi:bowl-mix',         17),
  (24, 'criolla',    'Comida criolla / almuerzos',   'mdi:silverware-fork-knife', 20),
  (25, 'andina',     'Comida andina',                'mdi:pot-steam',        21),
  (26, 'breakfast',  'Desayunos / pastelitos',       'mdi:egg-fried',        22),
  (27, 'pasteles',   'Pasteles',                     'mdi:food-croissant',   23),
  (28, 'bakery',     'Panadería / pastelería',       'mdi:bread-slice',      24),
  (29, 'waffles',    'Waffles',                      'mdi:checkerboard',     25),
  (30, 'churros',    'Churros',                      'mdi:cookie',           26),
  (31, 'juices',     'Jugos y batidos',              'mdi:cup',              28),
  (32, 'bar',        'Bar / tasca',                  'mdi:glass-mug-variant', 29),
  (33, 'froyo',      'Helado de yogurt griego',      'mdi:cup-outline',      31)
on conflict (id) do update
  set slug       = excluded.slug,
      label      = excluded.label,
      icon       = excluded.icon,
      sort_order = excluded.sort_order;

-- Ya no hay categoría "tacos" (id 4 pasó a "mexican"). Cualquier fila de
-- restaurant_categories que apuntara a tacos ahora significa "Comida
-- mexicana", que es equivalente para el uso.
