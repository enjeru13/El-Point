-- Reorder categories so the most common ones in San Cristóbal / Táchira lead,
-- and fix icon slugs that don't exist in the app's icon map.

update public.categories set sort_order = 1,  icon = 'corn'                 where slug = 'arepas';
update public.categories set sort_order = 2,  icon = 'hamburger'            where slug = 'burgers';
update public.categories set sort_order = 3,  icon = 'food-hot-dog'         where slug = 'hotdogs';
update public.categories set sort_order = 4,  icon = 'pizza'                where slug = 'pizza';
update public.categories set sort_order = 5,  icon = 'food-variant'         where slug = 'fastfood';
update public.categories set sort_order = 6,  icon = 'food-drumstick'       where slug = 'bbq';
update public.categories set sort_order = 7,  icon = 'ice-cream'            where slug = 'desserts';
update public.categories set sort_order = 8,  icon = 'coffee'              where slug = 'coffee';
update public.categories set sort_order = 9,  icon = 'noodles'              where slug = 'pasta';
update public.categories set sort_order = 10, icon = 'taco'                 where slug = 'tacos';
update public.categories set sort_order = 11, icon = 'fish'                 where slug = 'sushi';
update public.categories set sort_order = 12, icon = 'fish'                 where slug = 'seafood';
update public.categories set sort_order = 13, icon = 'leaf'                 where slug = 'vegan';
update public.categories set sort_order = 14, icon = 'silverware-fork-knife' where slug = 'finedining';
