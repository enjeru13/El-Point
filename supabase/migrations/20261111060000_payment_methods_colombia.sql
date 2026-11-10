-- Métodos de pago de Colombia: muchos locales de San Cristóbal cobran en pesos
-- por Bancolombia o Nequi.

insert into public.payment_methods (id, slug, label, icon, sort_order) values
  (9,  'bancolombia', 'Bancolombia', 'mdi:bank-outline',      7),
  (10, 'nequi',       'Nequi',       'mdi:cellphone-arrow-down', 8)
on conflict (id) do update
  set slug = excluded.slug,
      label = excluded.label,
      icon = excluded.icon,
      sort_order = excluded.sort_order;
