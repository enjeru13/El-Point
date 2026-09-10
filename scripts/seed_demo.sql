-- ═══════════════════════════════════════════════════════════════════════════
-- El Point — datos de demo para capturas de pantalla.
--
-- NO es una migración. Correr a mano en el SQL Editor de Supabase.
-- Idempotente: usa IDs fijos + ON CONFLICT DO NOTHING, se puede re-correr.
--
-- Para borrarlo después:
--   delete from public.restaurants where id like 'a0de0000-%';
--   (borra en cascada reseñas, réplicas, favoritos, comodidades de esos locales)
--   update public.profiles set streak_weeks = 0, streak_best = 0, streak_week_start = null
--     where id in ( ...los 6 comensales... );
--
-- Autores (de auth.users, ya existen):
--   564f14a7-0951-4fe7-b39f-23100e58c4e8  halfonsete   (admin, también reseña)
--   f80dcb1e-e9ed-42f6-a6ce-fad94260e751  Jesús O.     (comensal "héroe")
--   80eb6dda-266b-4d83-aa98-1fbea698654c  Ninibeth O.  (comensal)
--   6602217f-82b8-4efd-9ddc-ae24110469b3  Juan         (comensal)
--   4843b6c2-4e16-4a24-bcbc-cb3ec42c512a  Owen         (comensal)
--   e388e9ee-cc5c-450b-a23e-af87db925850  prueba       (comensal)
--   4f97a563-a696-4826-a451-ce9015ccf4e4  Antojitos Biangy (dueño)
--   1d26c93e-04b1-4228-b3a2-e71dc06963a9  boss             (dueño)
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. marcar a los dueños ───────────────────────────────────────────────
update public.profiles set role = 'restaurant_owner'
where id in (
  '4f97a563-a696-4826-a451-ce9015ccf4e4',
  '1d26c93e-04b1-4228-b3a2-e71dc06963a9'
);

-- ─── 2. locales (12) ──────────────────────────────────────────────────────
insert into public.restaurants
  (id, owner_id, name, description, address, location, whatsapp, instagram, phone,
   price_level, logo_url, cover_url, hours, is_active, status, submitted_at, reviewed_at,
   promo_text, boost_until)
values
 ('a0de0000-0000-4000-8000-000000000001', '4f97a563-a696-4826-a451-ce9015ccf4e4',
  'Antojitos Biangy', 'Arepas rellenas, tequeños y jugos naturales. Rápido y de la casa.',
  'Carrera 21 con calle 10, Barrio Obrero, San Cristóbal',
  st_setsrid(st_makepoint(-72.2212, 7.7724), 4326)::geography,
  '+58 414 7100011', 'antojitosbiangy', null, 1,
  'https://loremflickr.com/300/300/arepa,food?lock=21',
  'https://loremflickr.com/900/600/arepa,venezuela,food?lock=1',
  '{"days":[{"closed":true,"open":"08:00","close":"15:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"21:00"},{"closed":false,"open":"08:00","close":"21:00"}]}'::jsonb,
  true, 'approved', now() - interval '24 days', now() - interval '23 days',
  '2x1 en tequeños los martes', now() + interval '11 days'),

 ('a0de0000-0000-4000-8000-000000000002', '1d26c93e-04b1-4228-b3a2-e71dc06963a9',
  'Boss Burgers', 'Hamburguesas artesanales a la parrilla, papas rústicas y malteadas.',
  'Avenida España, C.C. Pirineos I, local 4, San Cristóbal',
  st_setsrid(st_makepoint(-72.2135, 7.7752), 4326)::geography,
  '+58 424 7100022', 'bossburgersvzla', null, 2,
  'https://loremflickr.com/300/300/burger,logo?lock=22',
  'https://loremflickr.com/900/600/hamburger,food?lock=2',
  '{"days":[{"closed":false,"open":"16:00","close":"23:00"},{"closed":false,"open":"16:00","close":"23:00"},{"closed":false,"open":"16:00","close":"23:00"},{"closed":false,"open":"16:00","close":"23:00"},{"closed":false,"open":"16:00","close":"23:00"},{"closed":false,"open":"16:00","close":"00:30"},{"closed":false,"open":"16:00","close":"00:30"}]}'::jsonb,
  true, 'approved', now() - interval '22 days', now() - interval '21 days',
  'Combo doble + papas Bs. 120', null),

 ('a0de0000-0000-4000-8000-000000000003', null,
  'La Parrilla Tachirense', 'Parrilla mixta, punta trasera y chorizo llanero. Ambiente familiar.',
  'Calle 6, Pirineos, San Cristóbal',
  st_setsrid(st_makepoint(-72.2109, 7.7889), 4326)::geography,
  '+58 416 7100033', 'parrillatachirense', null, 2,
  null, 'https://loremflickr.com/900/600/grill,barbecue,meat?lock=3',
  '{"days":[{"closed":false,"open":"12:00","close":"22:00"},{"closed":true,"open":"12:00","close":"22:00"},{"closed":false,"open":"12:00","close":"22:00"},{"closed":false,"open":"12:00","close":"22:00"},{"closed":false,"open":"12:00","close":"22:00"},{"closed":false,"open":"12:00","close":"23:30"},{"closed":false,"open":"12:00","close":"23:30"}]}'::jsonb,
  true, 'approved', now() - interval '30 days', now() - interval '29 days', null, null),

 ('a0de0000-0000-4000-8000-000000000004', null,
  'Pizzería Don Nicola', 'Pizza a la piedra, pastas caseras y calzones. Receta de familia.',
  'Carrera 5 con calle 8, Centro, San Cristóbal',
  st_setsrid(st_makepoint(-72.2251, 7.7669), 4326)::geography,
  '+58 412 7100044', 'donnicolapizza', '+58 276 3410044', 2,
  'https://loremflickr.com/300/300/pizza,logo?lock=24',
  'https://loremflickr.com/900/600/pizza,italian,food?lock=4',
  '{"days":[{"closed":false,"open":"12:00","close":"22:30"},{"closed":false,"open":"12:00","close":"22:30"},{"closed":false,"open":"12:00","close":"22:30"},{"closed":false,"open":"12:00","close":"22:30"},{"closed":false,"open":"12:00","close":"22:30"},{"closed":false,"open":"12:00","close":"23:59"},{"closed":false,"open":"12:00","close":"23:59"}]}'::jsonb,
  true, 'approved', now() - interval '28 days', now() - interval '27 days',
  'Miércoles de pizza familiar -30%', now() + interval '9 days'),

 ('a0de0000-0000-4000-8000-000000000005', null,
  'Café de la Montaña', 'Café de la zona alta, tortas del día y desayunos criollos.',
  'Calle 14, Las Lomas, San Cristóbal',
  st_setsrid(st_makepoint(-72.2352, 7.7601), 4326)::geography,
  '+58 414 7100055', 'cafedelamontana', null, 1,
  'https://loremflickr.com/300/300/coffee,logo?lock=25',
  'https://loremflickr.com/900/600/coffee,cafe,latte?lock=5',
  '{"days":[{"closed":false,"open":"07:00","close":"19:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"21:00"},{"closed":false,"open":"07:30","close":"21:00"}]}'::jsonb,
  true, 'approved', now() - interval '26 days', now() - interval '25 days',
  'Café + torta Bs. 60 hasta las 4pm', null),

 ('a0de0000-0000-4000-8000-000000000006', null,
  'Sushi Yama', 'Rolls clásicos y de la casa, gyozas y ramen. Para comer aquí o llevar.',
  'Carrera 19 con calle 13, Barrio Obrero, San Cristóbal',
  st_setsrid(st_makepoint(-72.2224, 7.7738), 4326)::geography,
  '+58 424 7100066', 'sushiyama.sc', null, 3,
  null, 'https://loremflickr.com/900/600/sushi,japanese,food?lock=6',
  '{"days":[{"closed":true,"open":"12:00","close":"22:00"},{"closed":false,"open":"12:30","close":"22:00"},{"closed":false,"open":"12:30","close":"22:00"},{"closed":false,"open":"12:30","close":"22:00"},{"closed":false,"open":"12:30","close":"22:00"},{"closed":false,"open":"12:30","close":"23:00"},{"closed":false,"open":"12:30","close":"23:00"}]}'::jsonb,
  true, 'approved', now() - interval '19 days', now() - interval '18 days', null, null),

 ('a0de0000-0000-4000-8000-000000000007', null,
  'Arepera La Esquina', 'La reina pepiada, la pelúa y la catira. Abierta desde temprano.',
  'Avenida 19 de Abril, La Concordia, San Cristóbal',
  st_setsrid(st_makepoint(-72.2301, 7.7503), 4326)::geography,
  '+58 416 7100077', null, null, 1,
  null, 'https://loremflickr.com/900/600/arepa,corn,food?lock=7',
  '{"days":[{"closed":false,"open":"06:30","close":"14:00"},{"closed":false,"open":"06:00","close":"15:00"},{"closed":false,"open":"06:00","close":"15:00"},{"closed":false,"open":"06:00","close":"15:00"},{"closed":false,"open":"06:00","close":"15:00"},{"closed":false,"open":"06:00","close":"15:00"},{"closed":false,"open":"06:30","close":"14:00"}]}'::jsonb,
  true, 'approved', now() - interval '21 days', now() - interval '20 days', null, null),

 ('a0de0000-0000-4000-8000-000000000008', null,
  'El Rincón Vegano', 'Cocina 100% vegetal: bowls, hamburguesas de lenteja y postres sin lácteos.',
  'Calle 4, San Carlos, San Cristóbal',
  st_setsrid(st_makepoint(-72.2183, 7.7781), 4326)::geography,
  '+58 414 7100088', 'elrinconvegano.sc', null, 2,
  'https://loremflickr.com/300/300/vegan,logo?lock=28',
  'https://loremflickr.com/900/600/vegan,salad,bowl?lock=8',
  '{"days":[{"closed":true,"open":"12:00","close":"20:00"},{"closed":false,"open":"11:30","close":"20:00"},{"closed":false,"open":"11:30","close":"20:00"},{"closed":false,"open":"11:30","close":"20:00"},{"closed":false,"open":"11:30","close":"20:00"},{"closed":false,"open":"11:30","close":"21:00"},{"closed":false,"open":"11:30","close":"21:00"}]}'::jsonb,
  true, 'approved', now() - interval '17 days', now() - interval '16 days', null, null),

 ('a0de0000-0000-4000-8000-000000000009', null,
  'Mariscos El Puerto', 'Ceviche, cazuela de mariscos y pescado frito. Los fines de semana repleto.',
  'Avenida Carabobo, Puente Real, San Cristóbal',
  st_setsrid(st_makepoint(-72.2223, 7.7602), 4326)::geography,
  '+58 424 7100099', null, null, 2,
  null, 'https://loremflickr.com/900/600/seafood,ceviche,fish?lock=9',
  '{"days":[{"closed":false,"open":"11:00","close":"18:00"},{"closed":true,"open":"11:00","close":"18:00"},{"closed":false,"open":"11:00","close":"18:00"},{"closed":false,"open":"11:00","close":"18:00"},{"closed":false,"open":"11:00","close":"18:00"},{"closed":false,"open":"11:00","close":"19:00"},{"closed":false,"open":"11:00","close":"19:00"}]}'::jsonb,
  true, 'approved', now() - interval '27 days', now() - interval '26 days', null, null),

 ('a0de0000-0000-4000-8000-000000000010', null,
  'Tacos El Compa', 'Tacos al pastor, quesadillas y nachos. Salsas de la casa, pica de verdad.',
  'Calle 3, Sabaneta, San Cristóbal',
  st_setsrid(st_makepoint(-72.2298, 7.7951), 4326)::geography,
  '+58 416 7100110', 'tacoselcompa', null, 1,
  'https://loremflickr.com/300/300/taco,logo?lock=30',
  'https://loremflickr.com/900/600/tacos,mexican,food?lock=10',
  '{"days":[{"closed":false,"open":"17:00","close":"23:00"},{"closed":true,"open":"17:00","close":"23:00"},{"closed":false,"open":"17:00","close":"23:00"},{"closed":false,"open":"17:00","close":"23:00"},{"closed":false,"open":"17:00","close":"23:00"},{"closed":false,"open":"17:00","close":"00:30"},{"closed":false,"open":"17:00","close":"00:30"}]}'::jsonb,
  true, 'approved', now() - interval '15 days', now() - interval '14 days', null, null),

 ('a0de0000-0000-4000-8000-000000000011', null,
  'Perros Calientes El Gordo', 'El perro completo con todo, salchipapas y patacón. Clásico de la noche.',
  'Los Kioskos, Avenida 7, San Cristóbal',
  st_setsrid(st_makepoint(-72.2278, 7.7691), 4326)::geography,
  '+58 414 7100121', null, null, 1,
  null, 'https://loremflickr.com/900/600/hotdog,street,food?lock=11',
  '{"days":[{"closed":false,"open":"18:00","close":"01:00"},{"closed":true,"open":"18:00","close":"01:00"},{"closed":false,"open":"18:00","close":"01:00"},{"closed":false,"open":"18:00","close":"01:00"},{"closed":false,"open":"18:00","close":"01:00"},{"closed":false,"open":"18:00","close":"02:00"},{"closed":false,"open":"18:00","close":"02:00"}]}'::jsonb,
  true, 'approved', now() - interval '13 days', now() - interval '12 days', null, null),

 ('a0de0000-0000-4000-8000-000000000012', null,
  'Trattoria Bella Italia', 'Pastas frescas, risottos y carta de vinos. Ideal para una cena tranquila.',
  'Colinas de Pirineos, calle principal, San Cristóbal',
  st_setsrid(st_makepoint(-72.2051, 7.7932), 4326)::geography,
  '+58 424 7100132', 'bellaitalia.sc', '+58 276 3410132', 3,
  'https://loremflickr.com/300/300/pasta,logo?lock=32',
  'https://loremflickr.com/900/600/pasta,italian,restaurant?lock=12',
  '{"days":[{"closed":false,"open":"12:00","close":"22:00"},{"closed":true,"open":"12:00","close":"22:00"},{"closed":false,"open":"18:00","close":"22:30"},{"closed":false,"open":"18:00","close":"22:30"},{"closed":false,"open":"18:00","close":"22:30"},{"closed":false,"open":"12:00","close":"23:30"},{"closed":false,"open":"12:00","close":"23:30"}]}'::jsonb,
  true, 'approved', now() - interval '25 days', now() - interval '24 days', null, null)
on conflict (id) do nothing;

-- ─── 3. categorías por local ─────────────────────────────────────────────
insert into public.restaurant_categories (restaurant_id, category_id) values
 ('a0de0000-0000-4000-8000-000000000001', 14), ('a0de0000-0000-4000-8000-000000000001', 12),
 ('a0de0000-0000-4000-8000-000000000002', 2),  ('a0de0000-0000-4000-8000-000000000002', 12),
 ('a0de0000-0000-4000-8000-000000000003', 9),
 ('a0de0000-0000-4000-8000-000000000004', 1),  ('a0de0000-0000-4000-8000-000000000004', 10),
 ('a0de0000-0000-4000-8000-000000000005', 6),  ('a0de0000-0000-4000-8000-000000000005', 7),
 ('a0de0000-0000-4000-8000-000000000006', 3),
 ('a0de0000-0000-4000-8000-000000000007', 14),
 ('a0de0000-0000-4000-8000-000000000008', 5),
 ('a0de0000-0000-4000-8000-000000000009', 11),
 ('a0de0000-0000-4000-8000-000000000010', 4),  ('a0de0000-0000-4000-8000-000000000010', 12),
 ('a0de0000-0000-4000-8000-000000000011', 13),
 ('a0de0000-0000-4000-8000-000000000012', 10), ('a0de0000-0000-4000-8000-000000000012', 8)
on conflict do nothing;

-- ─── 4. comodidades por local ────────────────────────────────────────────
insert into public.restaurant_amenities (restaurant_id, amenity_id) values
 ('a0de0000-0000-4000-8000-000000000001', 3), ('a0de0000-0000-4000-8000-000000000001', 5),  ('a0de0000-0000-4000-8000-000000000001', 6),  ('a0de0000-0000-4000-8000-000000000001', 10), ('a0de0000-0000-4000-8000-000000000001', 13),
 ('a0de0000-0000-4000-8000-000000000002', 1), ('a0de0000-0000-4000-8000-000000000002', 3),  ('a0de0000-0000-4000-8000-000000000002', 9),  ('a0de0000-0000-4000-8000-000000000002', 12), ('a0de0000-0000-4000-8000-000000000002', 16),
 ('a0de0000-0000-4000-8000-000000000003', 2), ('a0de0000-0000-4000-8000-000000000003', 4),  ('a0de0000-0000-4000-8000-000000000003', 6),  ('a0de0000-0000-4000-8000-000000000003', 11), ('a0de0000-0000-4000-8000-000000000003', 15),
 ('a0de0000-0000-4000-8000-000000000004', 1), ('a0de0000-0000-4000-8000-000000000004', 3),  ('a0de0000-0000-4000-8000-000000000004', 6),  ('a0de0000-0000-4000-8000-000000000004', 9),  ('a0de0000-0000-4000-8000-000000000004', 14),
 ('a0de0000-0000-4000-8000-000000000005', 1), ('a0de0000-0000-4000-8000-000000000005', 3),  ('a0de0000-0000-4000-8000-000000000005', 4),  ('a0de0000-0000-4000-8000-000000000005', 8),  ('a0de0000-0000-4000-8000-000000000005', 9),
 ('a0de0000-0000-4000-8000-000000000006', 1), ('a0de0000-0000-4000-8000-000000000006', 3),  ('a0de0000-0000-4000-8000-000000000006', 9),  ('a0de0000-0000-4000-8000-000000000006', 12), ('a0de0000-0000-4000-8000-000000000006', 13),
 ('a0de0000-0000-4000-8000-000000000007', 6), ('a0de0000-0000-4000-8000-000000000007', 10), ('a0de0000-0000-4000-8000-000000000007', 13),
 ('a0de0000-0000-4000-8000-000000000008', 1), ('a0de0000-0000-4000-8000-000000000008', 3),  ('a0de0000-0000-4000-8000-000000000008', 8),  ('a0de0000-0000-4000-8000-000000000008', 9),  ('a0de0000-0000-4000-8000-000000000008', 14),
 ('a0de0000-0000-4000-8000-000000000009', 2), ('a0de0000-0000-4000-8000-000000000009', 6),  ('a0de0000-0000-4000-8000-000000000009', 10), ('a0de0000-0000-4000-8000-000000000009', 16),
 ('a0de0000-0000-4000-8000-000000000010', 3), ('a0de0000-0000-4000-8000-000000000010', 10), ('a0de0000-0000-4000-8000-000000000010', 13), ('a0de0000-0000-4000-8000-000000000010', 18),
 ('a0de0000-0000-4000-8000-000000000011', 10), ('a0de0000-0000-4000-8000-000000000011', 13),
 ('a0de0000-0000-4000-8000-000000000012', 2), ('a0de0000-0000-4000-8000-000000000012', 3),  ('a0de0000-0000-4000-8000-000000000012', 9),  ('a0de0000-0000-4000-8000-000000000012', 14), ('a0de0000-0000-4000-8000-000000000012', 17)
on conflict do nothing;

-- ─── 5. reseñas (backdateadas; 1 por local+autor) ────────────────────────
-- Los triggers otorgan XP, refrescan rating_avg, avisan al dueño y evalúan misiones.
insert into public.reviews (restaurant_id, author_id, rating, body, created_at) values
 -- Jesús O. (héroe): 8 locales
 ('a0de0000-0000-4000-8000-000000000001','f80dcb1e-e9ed-42f6-a6ce-fad94260e751',5,'Los tequeños brutales y la reina pepiada bien servida. Atienden rapidísimo.', now() - interval '20 days'),
 ('a0de0000-0000-4000-8000-000000000002','f80dcb1e-e9ed-42f6-a6ce-fad94260e751',5,'La doble con queso amarillo es un golazo. Las papas rústicas también.', now() - interval '17 days'),
 ('a0de0000-0000-4000-8000-000000000003','f80dcb1e-e9ed-42f6-a6ce-fad94260e751',4,'Buena carne y el chorizo llanero muy bueno. A veces tardan cuando está lleno.', now() - interval '14 days'),
 ('a0de0000-0000-4000-8000-000000000004','f80dcb1e-e9ed-42f6-a6ce-fad94260e751',5,'La napolitana a la piedra es la mejor del centro. Masa delgada y crocante.', now() - interval '11 days'),
 ('a0de0000-0000-4000-8000-000000000006','f80dcb1e-e9ed-42f6-a6ce-fad94260e751',4,'Rolls frescos y buen precio para lo que traen. El ramen podría venir más caliente.', now() - interval '8 days'),
 ('a0de0000-0000-4000-8000-000000000009','f80dcb1e-e9ed-42f6-a6ce-fad94260e751',5,'El ceviche mixto espectacular. Ir temprano el domingo o no hay puesto.', now() - interval '6 days'),
 ('a0de0000-0000-4000-8000-000000000010','f80dcb1e-e9ed-42f6-a6ce-fad94260e751',4,'Tacos al pastor bien servidos y la salsa pica de verdad. Local pequeño.', now() - interval '3 days'),
 ('a0de0000-0000-4000-8000-000000000012','f80dcb1e-e9ed-42f6-a6ce-fad94260e751',5,'Los ñoquis caseros y el risotto de hongos, de otro nivel. Buen sitio para cenar.', now() - interval '2 days'),
 -- Ninibeth O.
 ('a0de0000-0000-4000-8000-000000000001','80eb6dda-266b-4d83-aa98-1fbea698654c',4,'Rico y económico. Los jugos naturales bien preparados.', now() - interval '19 days'),
 ('a0de0000-0000-4000-8000-000000000005','80eb6dda-266b-4d83-aa98-1fbea698654c',5,'La torta de zanahoria y el capuchino, mi combo fijo. Vista linda además.', now() - interval '13 days'),
 ('a0de0000-0000-4000-8000-000000000007','80eb6dda-266b-4d83-aa98-1fbea698654c',4,'Arepas grandes y bien rellenas. Ideal para desayunar temprano.', now() - interval '10 days'),
 ('a0de0000-0000-4000-8000-000000000008','80eb6dda-266b-4d83-aa98-1fbea698654c',5,'Por fin un sitio 100% vegano en la ciudad. El bowl de lentejas riquísimo.', now() - interval '7 days'),
 ('a0de0000-0000-4000-8000-000000000012','80eb6dda-266b-4d83-aa98-1fbea698654c',4,'Muy buena pasta, ambiente tranquilo. Los precios sí son altos.', now() - interval '4 days'),
 -- Juan
 ('a0de0000-0000-4000-8000-000000000002','6602217f-82b8-4efd-9ddc-ae24110469b3',4,'Buenas hamburguesas, porción generosa. El local se llena los viernes.', now() - interval '16 days'),
 ('a0de0000-0000-4000-8000-000000000003','6602217f-82b8-4efd-9ddc-ae24110469b3',5,'Parrilla como debe ser. La punta trasera en su punto.', now() - interval '12 days'),
 ('a0de0000-0000-4000-8000-000000000004','6602217f-82b8-4efd-9ddc-ae24110469b3',4,'Pizza muy buena, el servicio a veces lento pero vale la pena.', now() - interval '9 days'),
 ('a0de0000-0000-4000-8000-000000000010','6602217f-82b8-4efd-9ddc-ae24110469b3',4,'Los nachos con todo son enormes. Buen sitio para ir con amigos.', now() - interval '5 days'),
 ('a0de0000-0000-4000-8000-000000000011','6602217f-82b8-4efd-9ddc-ae24110469b3',3,'El perro completo cumple pero ya no es lo que era. Cola larga los sábados.', now() - interval '2 days'),
 -- Owen
 ('a0de0000-0000-4000-8000-000000000003','4843b6c2-4e16-4a24-bcbc-cb3ec42c512a',4,'Carne de calidad y buen ambiente familiar. Estacionamiento cómodo.', now() - interval '18 days'),
 ('a0de0000-0000-4000-8000-000000000005','4843b6c2-4e16-4a24-bcbc-cb3ec42c512a',5,'Excelente café y trato. Se puede ir con el perro, punto extra.', now() - interval '14 days'),
 ('a0de0000-0000-4000-8000-000000000006','4843b6c2-4e16-4a24-bcbc-cb3ec42c512a',5,'El mejor sushi de San Cristóbal. Los rolls de la casa hay que probarlos.', now() - interval '9 days'),
 ('a0de0000-0000-4000-8000-000000000009','4843b6c2-4e16-4a24-bcbc-cb3ec42c512a',4,'Pescado fresco y buena sazón. Solo abren hasta las 6, ojo con eso.', now() - interval '6 days'),
 ('a0de0000-0000-4000-8000-000000000012','4843b6c2-4e16-4a24-bcbc-cb3ec42c512a',5,'Cena de aniversario aquí, todo perfecto. La carta de vinos está bien armada.', now() - interval '1 day'),
 -- prueba
 ('a0de0000-0000-4000-8000-000000000001','e388e9ee-cc5c-450b-a23e-af87db925850',5,'Rápido, barato y sabroso. La catira quedó buenísima.', now() - interval '15 days'),
 ('a0de0000-0000-4000-8000-000000000004','e388e9ee-cc5c-450b-a23e-af87db925850',4,'Pizza rica, el calzone es enorme. Recomiendo reservar los fines de semana.', now() - interval '10 days'),
 ('a0de0000-0000-4000-8000-000000000007','e388e9ee-cc5c-450b-a23e-af87db925850',3,'Las arepas están bien pero el sitio es muy pequeño y hay que esperar parado.', now() - interval '7 days'),
 ('a0de0000-0000-4000-8000-000000000008','e388e9ee-cc5c-450b-a23e-af87db925850',4,'Opciones ricas y distintas. La hamburguesa de lenteja sorprende.', now() - interval '3 days'),
 -- halfonsete (admin, también reseña como usuario)
 ('a0de0000-0000-4000-8000-000000000002','564f14a7-0951-4fe7-b39f-23100e58c4e8',5,'Boss no falla. Malteada de Oreo brutal.', now() - interval '11 days'),
 ('a0de0000-0000-4000-8000-000000000005','564f14a7-0951-4fe7-b39f-23100e58c4e8',4,'Buen café para trabajar un rato. Wifi estable.', now() - interval '8 days'),
 ('a0de0000-0000-4000-8000-000000000010','564f14a7-0951-4fe7-b39f-23100e58c4e8',5,'Tacos al pastor top. La salsa verde pica sabroso.', now() - interval '4 days')
on conflict (restaurant_id, author_id) do nothing;

-- Que no aparezcan como "editado" (updated_at por defecto = now()).
update public.reviews set updated_at = created_at
where restaurant_id like 'a0de0000-%' and updated_at <> created_at;

-- ─── 6. respuestas de los dueños ────────────────────────────────────────
insert into public.review_replies (review_id, author_id, body)
select r.id, rs.owner_id,
       case when r.rating >= 4
            then '¡Gracias por la visita y por el apoyo! Te esperamos pronto.'
            else 'Gracias por el comentario, lo tomamos en cuenta para mejorar. ¡Vuelve pronto!'
       end
from public.reviews r
join public.restaurants rs on rs.id = r.restaurant_id
where rs.owner_id is not null
on conflict (review_id) do nothing;

-- ─── 7. favoritos (cada comensal, 4 locales al azar) ────────────────────
insert into public.favorites (user_id, restaurant_id)
select u.uid, x.id
from (values
  ('f80dcb1e-e9ed-42f6-a6ce-fad94260e751'::uuid),
  ('80eb6dda-266b-4d83-aa98-1fbea698654c'::uuid),
  ('6602217f-82b8-4efd-9ddc-ae24110469b3'::uuid),
  ('4843b6c2-4e16-4a24-bcbc-cb3ec42c512a'::uuid),
  ('e388e9ee-cc5c-450b-a23e-af87db925850'::uuid),
  ('564f14a7-0951-4fe7-b39f-23100e58c4e8'::uuid)
) u(uid)
cross join lateral (
  select id from public.restaurants
  where id like 'a0de0000-%'
  order by md5(u.uid::text || id::text)
  limit 4
) x
on conflict do nothing;

-- ─── 8. "me sirve" en reseñas ajenas (para helpful_count y misiones) ────
insert into public.review_helpful (user_id, review_id)
select u.uid, x.id
from (values
  ('f80dcb1e-e9ed-42f6-a6ce-fad94260e751'::uuid),
  ('80eb6dda-266b-4d83-aa98-1fbea698654c'::uuid),
  ('6602217f-82b8-4efd-9ddc-ae24110469b3'::uuid),
  ('4843b6c2-4e16-4a24-bcbc-cb3ec42c512a'::uuid),
  ('e388e9ee-cc5c-450b-a23e-af87db925850'::uuid),
  ('564f14a7-0951-4fe7-b39f-23100e58c4e8'::uuid)
) u(uid)
cross join lateral (
  select id from public.reviews
  where author_id <> u.uid
  order by md5(u.uid::text || id::text)
  limit 7
) x
on conflict do nothing;

-- ─── 9. rachas + re-evaluar misiones ───────────────────────────────────
update public.profiles
set streak_weeks = 4,
    streak_best  = greatest(streak_best, 4),
    streak_week_start = (date_trunc('week', now()))::date
where id in (
  'f80dcb1e-e9ed-42f6-a6ce-fad94260e751',
  '80eb6dda-266b-4d83-aa98-1fbea698654c'
);
update public.profiles
set streak_weeks = 2,
    streak_best  = greatest(streak_best, 2),
    streak_week_start = (date_trunc('week', now()))::date
where id = '6602217f-82b8-4efd-9ddc-ae24110469b3';

select public.evaluate_user_missions(v.id)
from (values
  ('f80dcb1e-e9ed-42f6-a6ce-fad94260e751'::uuid),
  ('80eb6dda-266b-4d83-aa98-1fbea698654c'::uuid),
  ('6602217f-82b8-4efd-9ddc-ae24110469b3'::uuid),
  ('4843b6c2-4e16-4a24-bcbc-cb3ec42c512a'::uuid),
  ('e388e9ee-cc5c-450b-a23e-af87db925850'::uuid),
  ('564f14a7-0951-4fe7-b39f-23100e58c4e8'::uuid)
) v(id);

commit;

-- Chequeo rápido:
--   select name, rating_avg, rating_count, promo_text, boost_until from public.restaurants where id like 'a0de0000-%' order by name;
--   select username, xp, level, streak_weeks from public.profiles where id = 'f80dcb1e-e9ed-42f6-a6ce-fad94260e751';
