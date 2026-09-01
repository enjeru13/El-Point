-- El Point — demo seed (San Cristobal, Tachira, Venezuela)
-- Safe to run multiple times. Reviews are NOT seeded (they need real auth users);
-- they come from the app once review submit is wired.

insert into public.restaurants
  (id, name, description, address, location, price_level, is_active, whatsapp, instagram, phone)
values
  ('11111111-1111-1111-1111-111111111111', 'La Smasheria',
   'Las mejores smash burgers de la ciudad. Ingredientes frescos, papas artesanales y salsas de la casa.',
   'Carrera 22 con Calle 14, Barrio Obrero, San Cristobal',
   st_makepoint(-72.2189, 7.7745)::geography, 2, true, '+58 412 1112233', 'la_smasheria', '+58 276 3441234'),

  ('22222222-2222-2222-2222-222222222222', 'Pizza Magica',
   'Masa fina de fermentacion lenta, horno de lena, ingredientes frescos.',
   'Avenida Espana, Las Lomas, San Cristobal',
   st_makepoint(-72.2210, 7.7825)::geography, 2, true, '+58 414 5556677', 'pizzamagica.sc', '+58 276 3564567'),

  ('33333333-3333-3333-3333-333333333333', 'El Perrero Loco',
   'Perros calientes de autor. Pan suave, salsas caseras, toppings sin limite.',
   'Avenida 19 de Abril, La Concordia, San Cristobal',
   st_makepoint(-72.2258, 7.7566)::geography, 1, true, '+58 424 8889900', 'perrero_loco', null),

  ('44444444-4444-4444-4444-444444444444', 'Arepa & Co.',
   'Arepas de maiz pilado rellenas al momento. Reina pepiada, pabellon, domino.',
   'Carrera 10 con Calle 5, Centro, San Cristobal',
   st_makepoint(-72.2251, 7.7669)::geography, 1, true, '+58 416 2223344', 'arepa.and.co', '+58 276 3421122'),

  ('55555555-5555-5555-5555-555555555555', 'Ruta 66',
   'Autentica experiencia de diner americano. Aplastamos nuestras hamburguesas a diario.',
   'Avenida Ferrero Tamayo, Pueblo Nuevo, San Cristobal',
   st_makepoint(-72.2360, 7.7930)::geography, 2, true, '+58 412 7778899', 'ruta66_sc', '+58 276 3520123'),

  ('66666666-6666-6666-6666-666666666666', 'Neon Noodle Bar',
   'Ramen, gyozas y bowls de fusion asiatica. Caldo de 12 horas.',
   'Avenida Los Agustinos, Pirineos, San Cristobal',
   st_makepoint(-72.2300, 7.7900)::geography, 3, true, '+58 414 3334455', 'neonnoodle', null)
on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      address = excluded.address,
      location = excluded.location,
      price_level = excluded.price_level,
      whatsapp = excluded.whatsapp,
      instagram = excluded.instagram,
      phone = excluded.phone;

-- Demo promos (idempotent)
update public.restaurants set promo_text = '2x1 en smash burgers todos los martes' where id = '11111111-1111-1111-1111-111111111111';
update public.restaurants set promo_text = '-20% en bowls antes de las 6pm'        where id = '66666666-6666-6666-6666-666666666666';
update public.restaurants set promo_text = 'Postre gratis con tu combo del dia'     where id = '44444444-4444-4444-4444-444444444444';

insert into public.restaurant_categories (restaurant_id, category_id)
values
  ('11111111-1111-1111-1111-111111111111', 2),   -- burgers
  ('22222222-2222-2222-2222-222222222222', 1),   -- pizza
  ('33333333-3333-3333-3333-333333333333', 13),  -- hotdogs
  ('44444444-4444-4444-4444-444444444444', 14),  -- arepas
  ('55555555-5555-5555-5555-555555555555', 2),   -- burgers
  ('55555555-5555-5555-5555-555555555555', 12),  -- fastfood
  ('66666666-6666-6666-6666-666666666666', 8)    -- finedining
on conflict (restaurant_id, category_id) do nothing;
