-- More amenities to pick from.

insert into public.amenities (id, slug, label, icon, sort_order) values
  (11, 'playground',   'Parque infantil',     'toy-brick',       11),
  (12, 'delivery',     'Delivery',            'bike',            12),
  (13, 'takeaway',     'Para llevar',         'shopping-bag',    13),
  (14, 'reservations', 'Acepta reservas',     'calendar-check',  14),
  (15, 'live_music',   'Música en vivo',      'music',           15),
  (16, 'tv_sports',    'TV / deportes',       'tv',              16),
  (17, 'bar',          'Bar / cócteles',      'martini',         17),
  (18, 'smoking_area', 'Zona de fumadores',   'cigarette',       18)
on conflict (id) do update
  set slug = excluded.slug,
      label = excluded.label,
      icon = excluded.icon,
      sort_order = excluded.sort_order;
