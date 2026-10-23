-- ═══════════════════════════════════════════════════════════════════════════
-- El Point — locales de demostración para la revisión de Apple y las capturas.
--
-- NO es una migración. Se corre a mano en el SQL Editor de Supabase.
-- Es idempotente: usa ids fijos (a0de0000-...) y no duplica si se vuelve a correr.
--
-- 6 locales aprobados y activos, sin dueño, con plan de cortesía de un año
-- (perfil completo: contacto, menú con precios, horario, promos, comodidades y
-- métodos de pago). Sin reseñas inventadas: salen como "Nuevo en El Point".
-- No consumen número de Original (se insertan directo, sin pasar por la
-- aprobación que lo asigna).
--
-- Mientras la app no se libere al público, solo la ven los revisores y los
-- probadores de TestFlight. Cuando Apple apruebe y antes de liberarla, se borran
-- con scripts/seed_review_cleanup.sql.
--
-- Las fotos son imágenes de ejemplo de loremflickr.com; para los locales reales
-- se suben las propias desde la app.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Locales ───────────────────────────────────────────────────────────
insert into public.restaurants
  (id, owner_id, name, description, address, location, whatsapp, instagram, phone,
   price_level, logo_url, cover_url, hours, is_active, status, submitted_at, reviewed_at,
   promo_text, promo_ends_at, paid_until, plan_period_start, plan_kind, menu_currencies,
   accepts_orders)
values
 ('a0de0000-0000-4000-8000-000000000001', null,
  'Arepas Doña Chela', 'Arepas rellenas al momento, tequeños y jugos naturales. Cocina de casa, atención rápida.',
  'Carrera 21 con calle 10, Barrio Obrero, San Cristóbal',
  st_setsrid(st_makepoint(-72.2212, 7.7724), 4326)::geography,
  '+58 414 5550101', 'arepasdonachela', null, 1,
  'https://loremflickr.com/300/300/arepa,logo?lock=101',
  'https://loremflickr.com/900/600/arepa,venezuela,food?lock=101',
  '{"days":[{"closed":true,"open":"08:00","close":"15:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"21:00"},{"closed":false,"open":"08:00","close":"21:00"}]}'::jsonb,
  true, 'approved', now() - interval '20 days', now() - interval '19 days',
  '2x1 en tequeños los martes', now() + interval '30 days',
  now() + interval '1 year', now(), 'courtesy', array['usd', 'bs'], true),

 ('a0de0000-0000-4000-8000-000000000002', null,
  'Burger Corner', 'Hamburguesas artesanales a la plancha, papas rústicas y malteadas espesas.',
  'Avenida España, C.C. Pirineos I, local 4, San Cristóbal',
  st_setsrid(st_makepoint(-72.2135, 7.7752), 4326)::geography,
  '+58 424 5550102', 'burgercorner.sc', null, 2,
  'https://loremflickr.com/300/300/burger,logo?lock=102',
  'https://loremflickr.com/900/600/hamburger,food?lock=102',
  '{"days":[{"closed":false,"open":"16:00","close":"23:00"},{"closed":false,"open":"16:00","close":"23:00"},{"closed":false,"open":"16:00","close":"23:00"},{"closed":false,"open":"16:00","close":"23:00"},{"closed":false,"open":"16:00","close":"23:00"},{"closed":false,"open":"16:00","close":"00:30"},{"closed":false,"open":"16:00","close":"00:30"}]}'::jsonb,
  true, 'approved', now() - interval '18 days', now() - interval '17 days',
  'Combo doble + papas con 15% de descuento', now() + interval '30 days',
  now() + interval '1 year', now(), 'courtesy', array['usd', 'bs'], true),

 ('a0de0000-0000-4000-8000-000000000003', null,
  'Pizzería La Masa', 'Pizza a la piedra, pastas caseras y calzones. Masa que reposa 48 horas.',
  'Carrera 5 con calle 8, Centro, San Cristóbal',
  st_setsrid(st_makepoint(-72.2251, 7.7669), 4326)::geography,
  '+58 412 5550103', 'pizzerialamasa', '+58 276 5550103', 2,
  'https://loremflickr.com/300/300/pizza,logo?lock=103',
  'https://loremflickr.com/900/600/pizza,italian,food?lock=103',
  '{"days":[{"closed":false,"open":"12:00","close":"22:30"},{"closed":false,"open":"12:00","close":"22:30"},{"closed":false,"open":"12:00","close":"22:30"},{"closed":false,"open":"12:00","close":"22:30"},{"closed":false,"open":"12:00","close":"22:30"},{"closed":false,"open":"12:00","close":"23:59"},{"closed":false,"open":"12:00","close":"23:59"}]}'::jsonb,
  true, 'approved', now() - interval '16 days', now() - interval '15 days',
  null, null,
  now() + interval '1 year', now(), 'courtesy', array['usd', 'bs'], true),

 ('a0de0000-0000-4000-8000-000000000004', null,
  'Café Los Andes', 'Café de altura, tortas del día y desayunos criollos. Ideal para trabajar con calma.',
  'Calle 14, Las Lomas, San Cristóbal',
  st_setsrid(st_makepoint(-72.2352, 7.7601), 4326)::geography,
  '+58 414 5550104', 'cafelosandes.sc', null, 1,
  'https://loremflickr.com/300/300/coffee,logo?lock=104',
  'https://loremflickr.com/900/600/coffee,cafe,latte?lock=104',
  '{"days":[{"closed":false,"open":"07:00","close":"19:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"20:00"},{"closed":false,"open":"07:00","close":"21:00"},{"closed":false,"open":"07:30","close":"21:00"}]}'::jsonb,
  true, 'approved', now() - interval '14 days', now() - interval '13 days',
  'Café + torta del día a precio especial hasta las 4 pm', now() + interval '30 days',
  now() + interval '1 year', now(), 'courtesy', array['usd', 'bs'], false),

 ('a0de0000-0000-4000-8000-000000000005', null,
  'Sushi Kai', 'Rolls clásicos y de la casa, gyozas y poke. Para comer aquí o llevar.',
  'Carrera 19 con calle 13, Barrio Obrero, San Cristóbal',
  st_setsrid(st_makepoint(-72.2224, 7.7738), 4326)::geography,
  '+58 424 5550105', 'sushikai.sc', null, 3,
  null,
  'https://loremflickr.com/900/600/sushi,japanese,food?lock=105',
  '{"days":[{"closed":true,"open":"12:00","close":"22:00"},{"closed":false,"open":"12:30","close":"22:00"},{"closed":false,"open":"12:30","close":"22:00"},{"closed":false,"open":"12:30","close":"22:00"},{"closed":false,"open":"12:30","close":"22:00"},{"closed":false,"open":"12:30","close":"23:00"},{"closed":false,"open":"12:30","close":"23:00"}]}'::jsonb,
  true, 'approved', now() - interval '12 days', now() - interval '11 days',
  null, null,
  now() + interval '1 year', now(), 'courtesy', array['usd', 'bs', 'cop'], true),

 ('a0de0000-0000-4000-8000-000000000006', null,
  'Parrilla El Samán', 'Parrilla mixta, punta trasera y chorizo llanero. Ambiente familiar y terraza.',
  'Calle 6, Pirineos, San Cristóbal',
  st_setsrid(st_makepoint(-72.2109, 7.7889), 4326)::geography,
  '+58 416 5550106', 'parrillaelsaman', null, 2,
  null,
  'https://loremflickr.com/900/600/grill,barbecue,meat?lock=106',
  '{"days":[{"closed":false,"open":"12:00","close":"22:00"},{"closed":true,"open":"12:00","close":"22:00"},{"closed":false,"open":"12:00","close":"22:00"},{"closed":false,"open":"12:00","close":"22:00"},{"closed":false,"open":"12:00","close":"22:00"},{"closed":false,"open":"12:00","close":"23:30"},{"closed":false,"open":"12:00","close":"23:30"}]}'::jsonb,
  true, 'approved', now() - interval '10 days', now() - interval '9 days',
  'Parrilla para dos con bebida incluida', now() + interval '30 days',
  now() + interval '1 year', now(), 'courtesy', array['usd', 'bs'], true)
on conflict (id) do nothing;

-- ─── 2. Categorías (por slug; si alguna ya no existe, simplemente se omite) ──
insert into public.restaurant_categories (restaurant_id, category_id)
select v.rid::uuid, c.id
from (values
  ('a0de0000-0000-4000-8000-000000000001', 'arepas'),
  ('a0de0000-0000-4000-8000-000000000002', 'burgers'),
  ('a0de0000-0000-4000-8000-000000000003', 'pizza'),
  ('a0de0000-0000-4000-8000-000000000003', 'pasta'),
  ('a0de0000-0000-4000-8000-000000000004', 'coffee'),
  ('a0de0000-0000-4000-8000-000000000004', 'desserts'),
  ('a0de0000-0000-4000-8000-000000000005', 'sushi'),
  ('a0de0000-0000-4000-8000-000000000006', 'bbq')
) as v(rid, slug)
join public.categories c on c.slug = v.slug
on conflict do nothing;

-- ─── 3. Comodidades (por slug) ───────────────────────────────────────────
insert into public.restaurant_amenities (restaurant_id, amenity_id)
select v.rid::uuid, a.id
from (values
  ('a0de0000-0000-4000-8000-000000000001', 'wifi'),
  ('a0de0000-0000-4000-8000-000000000001', 'air_conditioning'),
  ('a0de0000-0000-4000-8000-000000000002', 'wifi'),
  ('a0de0000-0000-4000-8000-000000000002', 'air_conditioning'),
  ('a0de0000-0000-4000-8000-000000000002', 'parking'),
  ('a0de0000-0000-4000-8000-000000000003', 'wifi'),
  ('a0de0000-0000-4000-8000-000000000003', 'air_conditioning'),
  ('a0de0000-0000-4000-8000-000000000004', 'wifi'),
  ('a0de0000-0000-4000-8000-000000000004', 'pet_friendly'),
  ('a0de0000-0000-4000-8000-000000000005', 'air_conditioning'),
  ('a0de0000-0000-4000-8000-000000000005', 'wifi'),
  ('a0de0000-0000-4000-8000-000000000006', 'parking'),
  ('a0de0000-0000-4000-8000-000000000006', 'outdoor_seating')
) as v(rid, slug)
join public.amenities a on a.slug = v.slug
on conflict do nothing;

-- ─── 4. Métodos de pago: todos los del catálogo ──────────────────────────
insert into public.restaurant_payment_methods (restaurant_id, payment_method_id)
select r.id, p.id
from public.restaurants r
cross join public.payment_methods p
where r.id::text like 'a0de0000-%'
on conflict do nothing;

-- ─── 5. Menú con precios (solo si el local aún no tiene platos) ──────────
insert into public.menu_items (restaurant_id, section, name, description, price_usd, position)
select v.rid::uuid, v.section, v.name, v.descr, v.price, v.pos
from (values
  ('a0de0000-0000-4000-8000-000000000001', 'Arepas', 'Reina pepiada', 'Pollo, aguacate y mayonesa', 3.50, 1),
  ('a0de0000-0000-4000-8000-000000000001', 'Arepas', 'Pelúa', 'Carne mechada y queso amarillo', 3.80, 2),
  ('a0de0000-0000-4000-8000-000000000001', 'Para picar', 'Tequeños (6 unidades)', 'Con salsa de ajo', 3.00, 3),
  ('a0de0000-0000-4000-8000-000000000001', 'Bebidas', 'Jugo natural', 'Parchita, mango o fresa', 1.80, 4),
  ('a0de0000-0000-4000-8000-000000000002', 'Hamburguesas', 'Clásica', 'Carne 150 g, queso, lechuga y tomate', 5.50, 1),
  ('a0de0000-0000-4000-8000-000000000002', 'Hamburguesas', 'Doble con queso amarillo', 'Doble carne, cheddar y salsa de la casa', 7.90, 2),
  ('a0de0000-0000-4000-8000-000000000002', 'Acompañantes', 'Papas rústicas', 'Con salsa BBQ', 2.80, 3),
  ('a0de0000-0000-4000-8000-000000000002', 'Bebidas', 'Malteada de chocolate', 'Espesa y con crema', 3.50, 4),
  ('a0de0000-0000-4000-8000-000000000003', 'Pizzas', 'Margarita', 'Salsa de tomate, mozzarella y albahaca', 7.00, 1),
  ('a0de0000-0000-4000-8000-000000000003', 'Pizzas', 'Napolitana', 'Jamón, champiñones y aceitunas', 9.50, 2),
  ('a0de0000-0000-4000-8000-000000000003', 'Pastas', 'Lasaña de carne', 'Al horno con bechamel', 8.00, 3),
  ('a0de0000-0000-4000-8000-000000000003', 'Bebidas', 'Refresco 1 L', null, 2.50, 4),
  ('a0de0000-0000-4000-8000-000000000004', 'Café', 'Café con leche', 'De altura, tostado local', 1.50, 1),
  ('a0de0000-0000-4000-8000-000000000004', 'Desayunos', 'Desayuno criollo', 'Huevos, arepa, queso y café', 4.50, 2),
  ('a0de0000-0000-4000-8000-000000000004', 'Postres', 'Torta del día', 'Pregunta por el sabor', 2.50, 3),
  ('a0de0000-0000-4000-8000-000000000004', 'Bebidas', 'Jugo de naranja', 'Natural, recién exprimido', 2.00, 4),
  ('a0de0000-0000-4000-8000-000000000005', 'Rolls', 'California roll (8 piezas)', 'Cangrejo, aguacate y pepino', 6.50, 1),
  ('a0de0000-0000-4000-8000-000000000005', 'Rolls', 'Roll Kai (8 piezas)', 'Salmón, queso crema y tempura', 9.00, 2),
  ('a0de0000-0000-4000-8000-000000000005', 'Entradas', 'Gyozas (5 unidades)', 'De pollo y vegetales', 4.50, 3),
  ('a0de0000-0000-4000-8000-000000000005', 'Poke', 'Poke de salmón', 'Arroz, salmón, edamame y mango', 10.50, 4),
  ('a0de0000-0000-4000-8000-000000000006', 'Parrilla', 'Parrilla mixta para dos', 'Res, cerdo, pollo y chorizo', 18.00, 1),
  ('a0de0000-0000-4000-8000-000000000006', 'Parrilla', 'Punta trasera 300 g', 'Con yuca y ensalada', 11.00, 2),
  ('a0de0000-0000-4000-8000-000000000006', 'Acompañantes', 'Chorizo llanero', 'Con arepa', 4.00, 3),
  ('a0de0000-0000-4000-8000-000000000006', 'Bebidas', 'Papelón con limón', 'Jarra', 3.50, 4)
) as v(rid, section, name, descr, price, pos)
where not exists (
  select 1 from public.menu_items m where m.restaurant_id = v.rid::uuid
);

commit;

select
  (select count(*) from public.restaurants where id::text like 'a0de0000-%') as locales,
  (select count(*) from public.menu_items m join public.restaurants r on r.id = m.restaurant_id where r.id::text like 'a0de0000-%') as platos,
  (select count(*) from public.restaurants where id::text like 'a0de0000-%' and founder_rank is not null) as con_numero_original;
