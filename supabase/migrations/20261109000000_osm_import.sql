-- Locales importados de OpenStreetMap (© colaboradores de OpenStreetMap,
-- licencia ODbL), revisados a mano en data/locales-osm-san-cristobal.xlsx.
--
-- Entran aprobados, SIN dueño (owner_id null) y con perfil básico: nombre,
-- categorías, dirección y pin. No son Originales, no tienen prueba gratis ni
-- Destacado: eso llega cuando el dueño reclame el local y se apruebe.
--
--   * restaurants.osm_id: de qué elemento de OSM vino (ej. "node/123"). Evita
--     duplicados si se vuelve a importar y marca qué locales se pueden reclamar.
--   * Los triggers de aprobación (Original, prueba de 3 meses y Destacado de
--     bienvenida) ahora exigen dueño, así un local sin dueño no gasta un número
--     de Original ni recibe tiempo de plan si un admin lo suspende y lo vuelve
--     a aprobar.

set local search_path = public, extensions;

alter table public.restaurants
  add column if not exists osm_id text unique;

-- Lectura por columna (ver 20260919020000): el origen del local es público.
grant select (osm_id) on public.restaurants to anon, authenticated;

comment on column public.restaurants.osm_id is
  'Elemento de OpenStreetMap del que se importó el local (node/…, way/…). Null si lo registró su dueño.';

-- ─── Triggers de aprobación: solo para locales con dueño ────────────────────
create or replace function public.assign_founder_rank()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_taken int;
begin
  if new.status = 'approved'
     and old.status is distinct from 'approved'
     and new.founder_rank is null
     and new.owner_id is not null then
    perform pg_advisory_xact_lock(hashtext('elpoint_founder_rank'));
    select count(*) into v_taken from public.restaurants where founder_rank is not null;
    if v_taken < 100 then
      new.founder_rank := v_taken + 1;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.grant_trial_on_approval()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved'
     and old.status is distinct from 'approved'
     and new.founder_rank is null
     and new.paid_until is null
     and new.owner_id is not null then
    -- 3 meses desde el registro (submitted_at), no desde la aprobación.
    new.paid_until := new.submitted_at + interval '3 months';
    new.plan_period_start := new.submitted_at;
    new.plan_kind := 'trial';
  end if;
  return new;
end;
$$;

create or replace function public.grant_boost_on_approval()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved'
     and old.status is distinct from 'approved'
     and new.boost_until is null
     and new.owner_id is not null then
    new.boost_until := now() + interval '14 days';
  end if;
  return new;
end;
$$;

-- ─── Los locales ────────────────────────────────────────────────────────────

insert into public.restaurants
  (osm_id, name, address, location, status, reviewed_at, is_active)
select v.osm_id, v.name, v.address,
       st_point(v.lng, v.lat)::geography, 'approved', now(), true
from (values
  ('way/438873572', 'Restaurante El Botalon', 'Avenida Ferrero Tamayo, Barrio Ambrosio Plaza, San Cristóbal', 7.787884, -72.211012),
  ('node/2547879121', 'Mega Sabor', 'Avenida Principal Pueblo Nuevo, Bello Monte, San Cristóbal', 7.780817, -72.211274),
  ('node/4359488036', 'Panadería Funchal', 'Avenida Principal Pueblo Nuevo, Bello Monte, San Cristóbal', 7.781152, -72.207821),
  ('node/6812985585', 'Rancho bonito', 'Avenida Quinimarí, Bello Monte, San Cristóbal', 7.782005, -72.204798),
  ('way/247187664', 'Asados Toripollo', 'Avenida España, Campo Alegre, San Cristóbal', 7.78671, -72.207154),
  ('node/11210890392', 'La Tradición Andina', 'Avenida Los Augustinos, Campo Alegre, San Cristóbal', 7.790702, -72.207823),
  ('way/247187653', 'McDonald''s', 'Avenida España, Campo Alegre, San Cristóbal', 7.787041, -72.207806),
  ('way/356891459', 'Panaderia Gran Avenida', 'Avenida España, Campo Alegre, San Cristóbal', 7.78155, -72.212596),
  ('node/4397518721', 'Panadería Broas', 'Avenida Martin Marciales, Campo Alegre, San Cristóbal', 7.787479, -72.215117),
  ('node/2547844822', 'Punta del Este', 'Avenida España, Campo Alegre, San Cristóbal', 7.78309, -72.213382),
  ('node/4985179627', 'Heladeria Maxi Cream', 'Carrera 6A, La Concordia, San Cristóbal', 7.757108, -72.235193),
  ('way/437207940', 'Panadería La Concordia', 'Calle 4 Bis, La Concordia, San Cristóbal', 7.757876, -72.232469),
  ('node/8911749704', 'Panadería Táchira', 'Carrera 6A, La Concordia, San Cristóbal', 7.755888, -72.23572),
  ('way/437207939', 'Panadería Virgen de Fátima', 'Avenida 8, La Concordia, San Cristóbal', 7.757821, -72.232073),
  ('way/437303532', 'El Fogón Restaurant', 'Avenida Lucio Oquendo, Las Delicias, San Cristóbal', 7.759146, -72.226567),
  ('node/14179754858', 'Panadería La Rika', 'Calle 3, Las Delicias, San Cristóbal', 7.758393, -72.22568),
  ('way/437206054', 'Restaurant La Tradición Andina', 'Carrera 11, Las Delicias, San Cristóbal', 7.758424, -72.228944),
  ('way/438484699', 'Restaurant Nan King', 'Carrera 13, Las Delicias, San Cristóbal', 7.761894, -72.226834),
  ('node/5223195227', 'Restaurant y Pollos en Brasa El Forastero', 'Avenida 19 de Abril, Las Delicias, San Cristóbal', 7.762873, -72.224434),
  ('node/8954971046', 'Panadería San Cristóbal', 'Calle 6, San Martín, San Cristóbal', 7.76647, -72.233574),
  ('node/4336866791', 'Restaurant Bologña', 'Calle 4, San Martín, San Cristóbal', 7.765294, -72.23107),
  ('node/11144413204', 'Pasapalos Valentina', 'Avenida Central, Urb. Merida, San Cristóbal', 7.758348, -72.224236),
  ('node/4272631889', 'Pan Paramillo', 'Avenida 4, Zona Industrial Paramillo, San Cristóbal', 7.80114, -72.205797),
  ('node/2548018966', 'Bosque Restaurant Estancia', 'Calle 9, Barrio Libertador, San Cristóbal', 7.766277, -72.215407),
  ('node/4356842995', 'Panadería Casa Blanca', 'Av. Fortunato Gomez, Barrio Libertador, San Cristóbal', 7.762511, -72.216728),
  ('node/2547710630', 'Arepera Amazonas', 'Carrera 15, Barrio Lourdes, San Cristóbal', 7.773149, -72.225132),
  ('node/880095883', 'Autopizzas Antonio', 'Carrera 20, Barrio Lourdes, San Cristóbal', 7.773086, -72.220513),
  ('node/2541192440', 'Botafogo', 'Calle 10, Barrio Lourdes, San Cristóbal', 7.768186, -72.218461),
  ('node/2540002870', 'Broaster', 'Carrera 20, Barrio Lourdes, San Cristóbal', 7.770787, -72.220629),
  ('node/2541192445', 'El Pilón', 'Carrera 20, Barrio Lourdes, San Cristóbal', 7.771494, -72.220472),
  ('node/2541192446', 'El Tostonazo', 'Carrera 19, Barrio Lourdes, San Cristóbal', 7.769675, -72.22172),
  ('way/303435622', 'Kandomble Brasas', 'Carrera 17, Barrio Lourdes, San Cristóbal', 7.769026, -72.223464),
  ('node/2547972282', 'Kobayashi Sushi', 'Calle 10, Barrio Lourdes, San Cristóbal', 7.76811, -72.218356),
  ('node/4427573189', 'La Tinaja Andina', 'Carrera 17, Barrio Lourdes, San Cristóbal', 7.768182, -72.223843),
  ('node/2548015108', 'Lalo''s', 'Carrera 17, Barrio Lourdes, San Cristóbal', 7.767311, -72.223551),
  ('node/2548950342', 'Panadería Carabobo', 'Avenida Carabobo, Barrio Lourdes, San Cristóbal', 7.775731, -72.224717),
  ('node/2539925302', 'Panadería Cristal', 'Pasaje Acueducto, Barrio Lourdes, San Cristóbal', 7.769121, -72.21861),
  ('node/2557684407', 'Perros y Hamburguesas La Reina', 'Carrera 18, Barrio Lourdes, San Cristóbal', 7.768797, -72.222615),
  ('node/2540002882', 'Pizzas El Punto', 'Carrera 20, Barrio Lourdes, San Cristóbal', 7.7718, -72.220043),
  ('node/2548015110', 'Pizzas La 10', 'Carrera 21, Barrio Lourdes, San Cristóbal', 7.768352, -72.219536),
  ('way/247062551', 'Wakame Sushi bar', 'Calle 10, Barrio Lourdes, San Cristóbal', 7.768404, -72.21989),
  ('way/246570493', '8 ½ Bar', 'Carrera 22, Barrio Obrero, San Cristóbal', 7.772349, -72.217949),
  ('node/4257922390', 'Berdes', 'Pasaje Acueducto, Barrio Obrero, San Cristóbal', 7.768833, -72.216203),
  ('node/2541192441', 'Cacao 40', 'Carrera 23, Barrio Obrero, San Cristóbal', 7.770853, -72.217423),
  ('way/496911746', 'Dulce y Dulce', 'Carrera 22, Barrio Obrero, San Cristóbal', 7.773981, -72.217917),
  ('node/2547778770', 'Entreverado', 'Calle 14, Barrio Obrero, San Cristóbal', 7.773215, -72.221661),
  ('node/2547989091', 'Panadería Francesa', 'Calle 12, Barrio Obrero, San Cristóbal', 7.770747, -72.220372),
  ('way/1301646869', 'Panadería La Gran Cosecha', 'Carrera 21, Barrio Obrero, San Cristóbal', 7.772554, -72.219076),
  ('node/2540002901', 'Pizzas La Cotorra', 'Calle 15, Barrio Obrero, San Cristóbal', 7.773525, -72.219236),
  ('way/356896035', 'Pizzeria el Punto', 'Carrera 23, Barrio Obrero, San Cristóbal', 7.773536, -72.217345),
  ('node/2558819727', 'Sables Grill', 'Calle 14, Barrio Obrero, San Cristóbal', 7.772762, -72.220881),
  ('node/4581125492', 'Sargento Pimienta', 'Calle 14, Barrio Obrero, San Cristóbal', 7.772905, -72.219459),
  ('node/2540002904', 'Solare', 'Carrera 22, Barrio Obrero, San Cristóbal', 7.768609, -72.218296),
  ('way/665407032', 'BORDES Galeria Café', 'Carrera 13, Barrio San Carlos, San Cristóbal', 7.771185, -72.226898),
  ('node/11103580249', 'La Molienda Coffee', 'Carrera 20, Barrio San Carlos, San Cristóbal', 7.770182, -72.220613),
  ('node/2555165836', 'Marisquería Guidemar', 'Calle 13, Barrio San Carlos, San Cristóbal', 7.772375, -72.227139),
  ('node/2547778797', 'Pan House', 'Calle 11, Barrio San Carlos, San Cristóbal', 7.770585, -72.226546),
  ('node/2557684426', 'Pastelven', 'Calle 11, Barrio San Carlos, San Cristóbal', 7.770021, -72.220956),
  ('node/2541192451', 'Pollo en brasa San Cristóbal', 'Calle 11, Barrio San Carlos, San Cristóbal', 7.770236, -72.22096),
  ('node/13422437701', 'La esquina del amor', 'Avenida Carabobo, La Romera, San Cristóbal', 7.775579, -72.223103),
  ('node/13422285901', 'moa', 'Carrera 25, Sinaral, San Cristóbal', 7.768148, -72.215927),
  ('node/1312527273', 'Panadería El Viajero', 'Autopista San Cristóbal - La Fría, Táriba', 7.827543, -72.220427),
  ('node/2558819731', 'Vincenzo''s Pizzas', 'La Ermita, Zorca', 7.77933, -72.234268),
  ('node/4270840090', 'Panadería Tres esquinas', 'Calle Sta. Teresa, Sabana del Medio, Zorca', 7.799554, -72.220448),
  ('way/438215444', 'El Rey de las Cachapas', 'Avenida Machirí, Villa Olímpica, Zorca', 7.805221, -72.224627),
  ('node/1942625573', 'Arturo''s', 'Zona Industrial Las Lomas, Zorca', 7.794706, -72.234678),
  ('node/1942625569', 'McDonald''s', 'Zona Industrial Las Lomas, Zorca', 7.792681, -72.234828),
  ('node/2544283744', 'Restaurant La Vaquera', 'Avenida Libertador, Zona Industrial Las Lomas, Zorca', 7.799153, -72.232587)
) as v(osm_id, name, address, lat, lng)
on conflict (osm_id) do nothing;

insert into public.restaurant_categories (restaurant_id, category_id)
select r.id, v.category_id
from (values
  ('way/438873572', 24),
  ('node/2547879121', 23),
  ('node/4359488036', 28),
  ('node/6812985585', 9),
  ('way/247187664', 15),
  ('way/247187664', 9),
  ('way/247187664', 24),
  ('node/11210890392', 25),
  ('node/11210890392', 6),
  ('way/247187653', 2),
  ('way/356891459', 28),
  ('node/4397518721', 28),
  ('node/2547844822', 9),
  ('node/4985179627', 7),
  ('way/437207940', 28),
  ('node/8911749704', 28),
  ('way/437207939', 28),
  ('way/437303532', 24),
  ('node/14179754858', 28),
  ('way/437206054', 25),
  ('way/438484699', 23),
  ('node/5223195227', 15),
  ('node/5223195227', 9),
  ('node/8954971046', 28),
  ('node/4336866791', 10),
  ('node/11144413204', 6),
  ('node/4272631889', 28),
  ('node/2548018966', 8),
  ('node/2548018966', 2),
  ('node/4356842995', 28),
  ('node/2547710630', 14),
  ('node/2547710630', 24),
  ('node/880095883', 1),
  ('node/2541192440', 32),
  ('node/2540002870', 15),
  ('node/2541192445', 2),
  ('node/2541192446', 4),
  ('way/303435622', 9),
  ('node/2547972282', 3),
  ('node/4427573189', 25),
  ('node/4427573189', 6),
  ('node/2548015108', 2),
  ('node/2548015108', 18),
  ('node/2548015108', 13),
  ('node/2548950342', 28),
  ('node/2539925302', 28),
  ('node/2557684407', 2),
  ('node/2557684407', 13),
  ('node/2540002882', 1),
  ('node/2548015110', 1),
  ('way/247062551', 3),
  ('way/246570493', 32),
  ('node/4257922390', 32),
  ('node/4257922390', 24),
  ('node/2541192441', 7),
  ('node/2541192441', 6),
  ('way/496911746', 7),
  ('way/496911746', 6),
  ('node/2547778770', 9),
  ('node/2547989091', 28),
  ('way/1301646869', 28),
  ('node/2540002901', 1),
  ('way/356896035', 1),
  ('node/2558819727', 9),
  ('node/4581125492', 2),
  ('node/4581125492', 32),
  ('node/2540002904', 32),
  ('way/665407032', 1),
  ('way/665407032', 2),
  ('way/665407032', 6),
  ('node/11103580249', 6),
  ('node/2555165836', 11),
  ('node/2547778797', 28),
  ('node/2557684426', 27),
  ('node/2541192451', 15),
  ('node/2541192451', 9),
  ('node/13422437701', 2),
  ('node/13422285901', 6),
  ('node/1312527273', 28),
  ('node/2558819731', 1),
  ('node/4270840090', 28),
  ('way/438215444', 24),
  ('node/1942625573', 15),
  ('node/1942625569', 2),
  ('node/2544283744', 24)
) as v(osm_id, category_id)
join public.restaurants r on r.osm_id = v.osm_id
on conflict do nothing;
