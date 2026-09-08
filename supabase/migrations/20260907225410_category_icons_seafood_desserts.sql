-- Distinguish Mariscos from Sushi (both were 'fish'), and give Postres a
-- dessert-specific icon instead of ice-cream.

update public.categories set icon = 'shrimp' where slug = 'seafood';
update public.categories set icon = 'cake'   where slug = 'desserts';
