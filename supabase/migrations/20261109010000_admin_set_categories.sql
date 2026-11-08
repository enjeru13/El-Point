-- El admin puede cambiar las categorías de cualquier local desde el panel.
--
-- Hacía falta para los locales importados de OSM (sin dueño, nadie más puede
-- tocarlos) y para corregir categorías mal elegidas. Mismas reglas que
-- set_restaurant_categories (de 1 a 3), y el cambio queda en admin_audit_log.

create or replace function public.admin_set_restaurant_categories(
  p_restaurant_id uuid,
  p_category_ids smallint[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids smallint[];
  v_labels text;
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.restaurants where id = p_restaurant_id) then
    raise exception 'Local no encontrado';
  end if;

  select coalesce(array_agg(distinct c), '{}') into v_ids
  from unnest(coalesce(p_category_ids, '{}')) as c;

  if cardinality(v_ids) < 1 then
    raise exception 'Elige al menos una categoría';
  end if;
  if cardinality(v_ids) > 3 then
    raise exception 'Elige máximo 3 categorías';
  end if;
  if (select count(*) from public.categories where id = any (v_ids)) <> cardinality(v_ids) then
    raise exception 'Categoría no válida';
  end if;

  insert into public.restaurant_categories (restaurant_id, category_id)
  select p_restaurant_id, c from unnest(v_ids) as c
  on conflict do nothing;

  delete from public.restaurant_categories
  where restaurant_id = p_restaurant_id
    and category_id <> all (v_ids);

  select string_agg(label, ', ' order by label) into v_labels
  from public.categories where id = any (v_ids);

  insert into public.admin_audit_log (restaurant_id, admin_id, action, detail)
  values (p_restaurant_id, (select auth.uid()), 'set_categories', jsonb_build_object('reason', v_labels));
end;
$$;

revoke execute on function public.admin_set_restaurant_categories(uuid, smallint[]) from public, anon;
grant execute on function public.admin_set_restaurant_categories(uuid, smallint[]) to authenticated;
