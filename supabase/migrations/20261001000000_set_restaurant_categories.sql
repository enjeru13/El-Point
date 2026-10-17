-- El dueño puede corregir las categorías de su local después de registrarse.
-- Reemplazo atómico, como set_restaurant_amenities: mínimo 1 y máximo 3.

create or replace function public.set_restaurant_categories(
  p_restaurant_id uuid,
  p_category_ids smallint[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n int := coalesce(cardinality(p_category_ids), 0);
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.restaurants
    where id = p_restaurant_id and owner_id = uid
  ) then
    raise exception 'not your restaurant';
  end if;

  if n < 1 then
    raise exception 'Elige al menos una categoría';
  end if;
  if n > 3 then
    raise exception 'Elige máximo 3 categorías';
  end if;

  -- Primero se agregan las nuevas y luego se quitan las que sobran, para que
  -- el local nunca quede sin categoría a mitad del cambio.
  insert into public.restaurant_categories (restaurant_id, category_id)
  select p_restaurant_id, c
  from unnest(p_category_ids) as c
  on conflict do nothing;

  delete from public.restaurant_categories
  where restaurant_id = p_restaurant_id
    and category_id <> all (p_category_ids);
end;
$$;

revoke all on function public.set_restaurant_categories(uuid, smallint[]) from public, anon;
grant execute on function public.set_restaurant_categories(uuid, smallint[]) to authenticated;
