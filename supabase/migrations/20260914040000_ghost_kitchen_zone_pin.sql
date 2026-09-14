-- Pin opcional para cocinas fantasma que registraron solo zona en texto
-- (sin coordenadas) y luego quieren entrar al orden "cerca de mí" en
-- Home/Búsqueda. security invoker + RLS ("owners update own restaurants",
-- location no está en ningún revoke) -- mismo patrón que cualquier otro
-- campo que el dueño ya podía editar directo, solo que location necesita
-- construirse con PostGIS en vez de mandarla tal cual por PostgREST.
create or replace function public.set_restaurant_zone_location(
  p_restaurant_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  update public.restaurants
    set location = case
      when p_lat is null or p_lng is null then null
      else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    end
    where id = p_restaurant_id;
end;
$$;

grant execute on function public.set_restaurant_zone_location(uuid, double precision, double precision) to authenticated;
