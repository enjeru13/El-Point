-- SEGURIDAD / PRIVACIDAD: restaurants.rif y verification_photo_path eran
-- legibles por cualquiera con la llave pública (se vieron RIFs reales), y la
-- política de privacidad promete que el RIF y la foto de verificación no se
-- muestran públicamente.
--
-- 1) Funciones para que solo quien debe los lea:
--    * get_my_restaurant_private(): dueño -> lo de sus propios locales.
--    * admin_restaurant_private(ids): admin -> lo de los locales pedidos.
-- 2) Privilegios por columna en restaurants: se quita el select de tabla y se
--    concede columna por columna todo MENOS rif y verification_photo_path.
--    Escribirlas sigue igual (update de columna, no necesita select).
--
-- OJO: cualquier columna NUEVA en restaurants necesita su propio
-- "grant select (columna) on public.restaurants to anon, authenticated",
-- si no la app no la va a poder leer.

create or replace function public.get_my_restaurant_private()
returns table (restaurant_id uuid, rif text, verification_photo_path text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.rif, r.verification_photo_path
  from public.restaurants r
  where r.owner_id = auth.uid();
$$;

revoke execute on function public.get_my_restaurant_private() from public, anon;
grant execute on function public.get_my_restaurant_private() to authenticated;

create or replace function public.admin_restaurant_private(p_ids uuid[])
returns table (restaurant_id uuid, rif text, verification_photo_path text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select r.id, r.rif, r.verification_photo_path
    from public.restaurants r
    where r.id = any(p_ids);
end;
$$;

revoke execute on function public.admin_restaurant_private(uuid[]) from public, anon;
grant execute on function public.admin_restaurant_private(uuid[]) to authenticated;

revoke select on public.restaurants from anon, authenticated;

grant select (
  id, owner_id, name, description, address, location, latitude, longitude,
  whatsapp, instagram, phone, price_level, logo_url, cover_url, menu_pdf_url,
  promo_text, hours, is_active, status, status_reason, submitted_at,
  reviewed_at, rating_avg, rating_count, boost_until, boost_profile_awarded,
  founder_rank, paid_until, host_streak_weeks, ghost_kitchen, zone_label,
  created_at, updated_at
) on public.restaurants to anon, authenticated;
