-- Categorías de la 1.2:
--   * "Empanadas" pasa a "Pasteles y empanadas" (su slug ya era "pasteles";
--     los locales siguen ligados por id, nada se mueve).
--   * Nueva: "Cachapas", entre Comida andina y Pasteles y empanadas.

update public.categories
set label = 'Pasteles y empanadas'
where id = 27 and slug = 'pasteles';

insert into public.categories (id, slug, label, icon, sort_order)
values (34, 'cachapas', 'Cachapas', 'mdi:cheese', 22)
on conflict (id) do update
  set slug = excluded.slug,
      label = excluded.label,
      icon = excluded.icon,
      sort_order = excluded.sort_order;
