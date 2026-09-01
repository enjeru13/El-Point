-- Atomic helper: create a restaurant for the current owner + link its categories.
-- Avoids passing PostGIS geography through the REST layer from the client.

create or replace function public.create_owner_restaurant(
  p_name text,
  p_description text,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_whatsapp text,
  p_instagram text,
  p_category_ids smallint[]
)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  new_id uuid;
  uid uuid := auth.uid();
  cid smallint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.restaurants (owner_id, name, description, address, location, whatsapp, instagram)
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
    nullif(btrim(coalesce(p_instagram, '')), '')
  )
  returning id into new_id;

  if p_category_ids is not null then
    foreach cid in array p_category_ids loop
      insert into public.restaurant_categories (restaurant_id, category_id)
      values (new_id, cid)
      on conflict do nothing;
    end loop;
  end if;

  return new_id;
end;
$$;

grant execute on function public.create_owner_restaurant(
  text, text, text, double precision, double precision, text, text, smallint[]
) to authenticated;
