-- "Cocina fantasma" — locales sin local físico real (solo delivery/pickup
-- desde una cocina que no recibe clientes). No confundir con la comodidad
-- "Delivery" (id 12 en amenities) que cualquier restaurante normal puede
-- marcar además de tener local — esto es un concepto aparte: no hay local
-- al que llegar, punto.
--
--   * restaurants.ghost_kitchen: lo pone el dueño (a diferencia de
--     founder_rank/boost_until/paid_until, no hay razón para bloquearlo --
--     es autodeclarado, editable en cualquier momento desde su perfil).
--   * restaurants.zone_label: sector aproximado en texto libre (ej. "Barrio
--     Obrero"), se muestra en vez de la dirección exacta cuando es cocina
--     fantasma. Address real sigue existiendo para el resto de los locales.
--   * location/latitude/longitude se siguen usando igual para estos
--     -- un punto aproximado del sector (no la puerta real), para que
--     Home/Búsqueda los pueda ordenar por cercanía. Lo que cambia es que
--     nearby_restaurants() (el mapa) los excluye: esa pantalla es "ve y
--     camina hasta acá", no aplica si no hay puerta.

alter table public.restaurants
  add column if not exists ghost_kitchen boolean not null default false,
  add column if not exists zone_label text;

comment on column public.restaurants.ghost_kitchen is
  'Sin local físico -- solo delivery/pickup. No sale como pin en el mapa. Autodeclarado por el dueño, editable.';
comment on column public.restaurants.zone_label is
  'Sector aproximado en texto (ej. "Barrio Obrero") -- se muestra en vez de address cuando ghost_kitchen. No es la dirección exacta.';

-- nearby_restaurants: mismo cuerpo que 20260911180000_founder_restaurants.sql
-- + excluye cocinas fantasma (no hay puerta física a la que apuntar un pin).
create or replace function public.nearby_restaurants(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision default 5,
  filter_category text default null
)
returns table (
  id uuid,
  name text,
  address text,
  lat double precision,
  lng double precision,
  price_level smallint,
  rating_avg numeric,
  rating_count integer,
  cover_url text,
  logo_url text,
  boost_until timestamptz,
  founder_rank smallint,
  distance_m double precision
)
language sql
stable
security invoker
set search_path = extensions, public
as $$
  select
    r.id,
    r.name,
    r.address,
    st_y(r.location::geometry) as lat,
    st_x(r.location::geometry) as lng,
    r.price_level,
    r.rating_avg,
    r.rating_count,
    r.cover_url,
    r.logo_url,
    r.boost_until,
    r.founder_rank,
    st_distance(r.location, st_point(user_lng, user_lat)::geography) as distance_m
  from public.restaurants r
  where r.is_active
    and r.status = 'approved'
    and not r.ghost_kitchen
    and r.location is not null
    and st_dwithin(
      r.location,
      st_point(user_lng, user_lat)::geography,
      radius_km * 1000
    )
    and (
      filter_category is null
      or exists (
        select 1
        from public.restaurant_categories rc
        join public.categories c on c.id = rc.category_id
        where rc.restaurant_id = r.id and c.slug = filter_category
      )
    )
  order by
    (r.boost_until is not null and r.boost_until > now()) desc,
    distance_m
$$;

grant execute on function public.nearby_restaurants(
  double precision, double precision, double precision, text
) to anon, authenticated;
