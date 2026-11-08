-- Locales duplicados: un dueño registra como nuevo un local que ya estaba en
-- la app sin dueño (importado de OpenStreetMap).
--
--   * find_claimable_matches: locales sin dueño cerca del pin con un nombre
--     parecido. La app lo usa en el registro ("¿Es alguno de estos tu
--     local?") y el panel para avisar de un posible duplicado.
--   * admin_merge_duplicate: el admin confirma que son el mismo local. Se
--     queda el nuevo (con todo lo que cargó el dueño), recibe las reseñas,
--     favoritos y menciones del importado, y el importado se borra.

-- Nombre sin tildes, en minúsculas y sin palabras genéricas.
create or replace function public.locale_core_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
    regexp_replace(
      translate(lower(coalesce(p_name, '')), 'áéíóúüñ''’', 'aeiouun  '),
      '\m(restaurant|restaurante|rest|panaderia|pasteleria|pizzeria|pizzas|pizza|cafe|cafeteria|bar|heladeria|arepera|comida|rapida|y|el|la|los|las|de|del)\M',
      ' ', 'g'),
    '[^a-z0-9]+', ' ', 'g'));
$$;

create or replace function public.find_claimable_matches(
  p_name text,
  p_lat double precision,
  p_lng double precision,
  p_exclude uuid default null
)
returns table (id uuid, name text, address text, distance_m double precision)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with me as (
    select public.locale_core_name(p_name) as core,
           st_point(p_lng, p_lat)::geography as pt
  ),
  near as (
    select r.id, r.name, r.address,
           st_distance(r.location, me.pt) as d,
           public.locale_core_name(r.name) as core,
           me.core as my_core
    from public.restaurants r, me
    where r.owner_id is null
      and r.status = 'approved'
      and r.location is not null
      and r.id is distinct from p_exclude
      and p_lat is not null and p_lng is not null
      and st_dwithin(r.location, me.pt, 150)
  )
  select n.id, n.name, n.address, round(n.d::numeric)::double precision
  from near n
  where n.d <= 40
     or (n.my_core <> '' and n.core <> '' and (
          position(n.core in n.my_core) > 0
          or position(n.my_core in n.core) > 0
          or exists (
            select 1
            from unnest(string_to_array(n.core, ' ')) a
            join unnest(string_to_array(n.my_core, ' ')) b on a = b
            where char_length(a) >= 4
          )))
  order by n.d
  limit 5;
$$;

revoke execute on function public.find_claimable_matches(text, double precision, double precision, uuid) from public;
grant execute on function public.find_claimable_matches(text, double precision, double precision, uuid) to anon, authenticated;

-- ─── Fusionar ───────────────────────────────────────────────────────────────
create or replace function public.admin_merge_duplicate(p_new uuid, p_old uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := (select auth.uid());
  v_new record;
  v_old record;
begin
  if not public.is_admin(v_admin) then
    raise exception 'not authorized';
  end if;

  select id, name, owner_id, status into v_new from public.restaurants where id = p_new for update;
  select id, name, owner_id into v_old from public.restaurants where id = p_old for update;
  if v_new.id is null or v_old.id is null or p_new = p_old then
    raise exception 'Local no encontrado';
  end if;
  if v_new.owner_id is null or v_new.status <> 'pending' then
    raise exception 'El local nuevo debe estar pendiente y tener dueño';
  end if;
  if v_old.owner_id is not null then
    raise exception 'El local existente ya tiene dueño';
  end if;

  -- Reseñas y favoritos: si la misma persona ya los tiene en el nuevo, se
  -- queda el del nuevo.
  delete from public.reviews o
    where o.restaurant_id = p_old
      and exists (select 1 from public.reviews n where n.restaurant_id = p_new and n.author_id = o.author_id);
  update public.reviews set restaurant_id = p_new where restaurant_id = p_old;

  delete from public.favorites o
    where o.restaurant_id = p_old
      and exists (select 1 from public.favorites n where n.restaurant_id = p_new and n.user_id = o.user_id);
  update public.favorites set restaurant_id = p_new where restaurant_id = p_old;

  update public.restaurant_events set restaurant_id = p_new where restaurant_id = p_old;
  update public.posts set restaurant_id = p_new where restaurant_id = p_old;
  update public.post_replies set restaurant_id = p_new where restaurant_id = p_old;
  update public.local_suggestions set restaurant_id = p_new where restaurant_id = p_old;

  -- Quien había pedido el local existente queda avisado.
  with others as (
    update public.restaurant_claims
      set status = 'rejected',
          reason = 'Otra persona demostró ser la dueña de este local.',
          reviewed_at = now(), reviewed_by = v_admin
      where restaurant_id = p_old and status = 'pending'
      returning user_id
  )
  insert into public.notifications (recipient_id, type, title, body, data)
  select user_id, 'moderation', 'No pudimos aprobar tu solicitud',
         'Otra persona demostró ser la dueña de este local. Si es un error, escríbenos por Soporte.',
         jsonb_build_object('kind', 'claim_rejected')
  from others;

  delete from public.restaurants where id = p_old;

  update public.restaurants r
    set rating_count = agg.cnt,
        rating_avg = coalesce(agg.avg_rating, 0)
    from (
      select count(*)::int as cnt, round(avg(rating)::numeric, 1) as avg_rating
      from public.reviews where restaurant_id = p_new and moderation = 'visible'
    ) agg
    where r.id = p_new;

  -- Aprobar el nuevo: los triggers le dan Original o prueba, Destacado y el aviso.
  update public.restaurants
    set status = 'approved', status_reason = null, reviewed_at = now()
    where id = p_new;

  insert into public.admin_audit_log (restaurant_id, admin_id, action, detail)
  values (p_new, v_admin, 'merged_duplicate', jsonb_build_object('reason', 'Unido con "' || v_old.name || '"'));
end;
$$;

revoke execute on function public.admin_merge_duplicate(uuid, uuid) from public, anon;
grant execute on function public.admin_merge_duplicate(uuid, uuid) to authenticated;
