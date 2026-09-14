-- create_owner_restaurant: 2 parámetros opcionales nuevos al final
-- (compatible con la firma anterior) para registrar directo como cocina
-- fantasma -- location ya admitía null (p_lat/p_lng null -> location null),
-- así que el registro ya podía saltarse el pin del mapa; esto solo agrega
-- los campos propios del concepto.
create or replace function public.create_owner_restaurant(
  p_name text,
  p_description text,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_whatsapp text,
  p_instagram text,
  p_category_ids smallint[],
  p_rif text default null,
  p_verification_photo_path text default null,
  p_amenity_ids smallint[] default '{}',
  p_ghost_kitchen boolean default false,
  p_zone_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  uid uuid := auth.uid();
  cid smallint;
  aid smallint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = uid and banned_at is not null) then
    raise exception 'account banned';
  end if;

  if exists (select 1 from public.restaurants where owner_id = uid and status = 'pending') then
    raise exception 'Ya tienes un local en revisión';
  end if;

  insert into public.restaurants (
    owner_id, name, description, address, location, whatsapp, instagram,
    rif, verification_photo_path, status, ghost_kitchen, zone_label
  )
  values (
    uid,
    p_name,
    nullif(btrim(coalesce(p_description, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    case
      when p_lat is null or p_lng is null then null
      else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    end,
    nullif(btrim(coalesce(p_whatsapp, '')), ''),
    nullif(btrim(coalesce(p_instagram, '')), ''),
    nullif(btrim(coalesce(p_rif, '')), ''),
    nullif(btrim(coalesce(p_verification_photo_path, '')), ''),
    'pending',
    coalesce(p_ghost_kitchen, false),
    nullif(btrim(coalesce(p_zone_label, '')), '')
  )
  returning id into new_id;

  if p_category_ids is not null then
    foreach cid in array p_category_ids loop
      insert into public.restaurant_categories (restaurant_id, category_id)
      values (new_id, cid) on conflict do nothing;
    end loop;
  end if;

  if p_amenity_ids is not null then
    foreach aid in array p_amenity_ids loop
      insert into public.restaurant_amenities (restaurant_id, amenity_id)
      values (new_id, aid) on conflict do nothing;
    end loop;
  end if;

  return new_id;
end;
$$;

grant execute on function public.create_owner_restaurant(
  text, text, text, double precision, double precision, text, text, smallint[], text, text, smallint[], boolean, text
) to authenticated;
