-- Dos comodidades nuevas: Planta eléctrica (cortes de luz) y Menú infantil.
-- Íconos MDI verificados contra el glyphmap empaquetado.

insert into public.amenities (id, slug, label, icon, sort_order) values
  (19, 'power_generator', 'Planta eléctrica', 'mdi:generator-stationary', 19),
  (20, 'kids_menu',       'Menú infantil',    'mdi:teddy-bear',           20)
on conflict (id) do update
  set slug = excluded.slug,
      label = excluded.label,
      icon = excluded.icon,
      sort_order = excluded.sort_order;
