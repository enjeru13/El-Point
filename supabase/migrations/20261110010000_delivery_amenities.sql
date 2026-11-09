-- Vuelven Delivery y Para llevar al catálogo de comodidades.
--
-- Se habían quitado en 20260918000000_remove_amenities.sql. El pedido por
-- WhatsApp desde el menú (20261110000000_menu_orders.sql) las usa por slug
-- para preguntar "Paso a buscarlo" o "Delivery", pedir la ubicación de
-- entrega y mostrar el costo del delivery que configura el dueño.

insert into public.amenities (id, slug, label, icon, sort_order) values
  (12, 'delivery', 'Delivery',    'mdi:bike',                  12),
  (13, 'takeaway', 'Para llevar', 'mdi:bag-personal-outline',  13)
on conflict (id) do update
  set slug = excluded.slug,
      label = excluded.label,
      icon = excluded.icon,
      sort_order = excluded.sort_order;
