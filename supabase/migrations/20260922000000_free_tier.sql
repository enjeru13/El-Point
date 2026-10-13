-- Perfil básico (gratis) vs. perfil completo (plan).
--
-- Antes: un local no-Original con el plan vencido desaparecía de la app. Con
-- pocos locales eso deja el mapa vacío, así que ahora TODO local aprobado y
-- activo es visible, y lo que depende del plan es lo que se ve DENTRO del
-- perfil:
--
--   gratis    nombre, categorías, dirección y pin en el mapa; el dueño ve sus
--             reseñas. Las cocinas fantasma conservan además el WhatsApp
--             (sin él no hay forma de encontrarlas).
--   con plan  contacto (WhatsApp, llamada, Instagram), menú, fotos, horario,
--             promo, comodidades, métodos de pago, responder reseñas,
--             métricas y Destacado.
--
-- "Con plan" = Original (founder_rank) o paid_until en el futuro. La prueba
-- de 3 meses ya fija paid_until, así que cuenta igual.
--
-- Lo que tiene valor directo (contacto y menú) se oculta AQUÍ, en el
-- servidor: no se puede leer con la API aunque la app no lo muestre. El resto
-- (fotos, horario, promo, comodidades, pagos) lo oculta la app; no es
-- sensible y no vale la pena una capa más.

-- ─── 1. ¿Tiene plan? ────────────────────────────────────────────────────────
create or replace function public.restaurant_has_plan(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select r.founder_rank is not null
          or (r.paid_until is not null and r.paid_until > now())
      from public.restaurants r
      where r.id = p_id
    ),
    false
  );
$$;

revoke execute on function public.restaurant_has_plan(uuid) from public;
grant execute on function public.restaurant_has_plan(uuid) to anon, authenticated;

-- ─── 2. Todo local aprobado y activo es visible ─────────────────────────────
drop policy if exists "active restaurants are viewable by everyone" on public.restaurants;
create policy "active restaurants are viewable by everyone"
  on public.restaurants for select
  using (
    (status = 'approved' and is_active)
    or owner_id = (select auth.uid())
    or public.is_admin((select auth.uid()))
  );

-- ─── 3. El contacto deja de ser legible con select directo ──────────────────
revoke select (whatsapp, instagram, phone, menu_pdf_url)
  on public.restaurants from anon, authenticated;

-- restaurant_profile_complete lee whatsapp/phone: ahora corre con los
-- privilegios de su dueño para no depender del select de quien la llama.
create or replace function public.restaurant_profile_complete(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.logo_url is not null and r.cover_url is not null
    and coalesce(btrim(r.description), '') <> ''
    and coalesce(btrim(r.address), '') <> ''
    and (coalesce(btrim(r.whatsapp), '') <> '' or coalesce(btrim(r.phone), '') <> '')
    and exists (select 1 from public.restaurant_categories rc where rc.restaurant_id = r.id)
    and exists (select 1 from public.restaurant_amenities  ra where ra.restaurant_id = r.id)
  from public.restaurants r
  where r.id = p_id;
$$;

-- Dueño y admin leen los datos privados por estas funciones (ahora con el
-- contacto incluido). Cambia el tipo de retorno, así que se recrean.
drop function if exists public.get_my_restaurant_private();
create function public.get_my_restaurant_private()
returns table (
  restaurant_id uuid,
  rif text,
  verification_photo_path text,
  phone text,
  whatsapp text,
  instagram text,
  menu_pdf_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.rif, r.verification_photo_path, r.phone, r.whatsapp, r.instagram, r.menu_pdf_url
  from public.restaurants r
  where r.owner_id = auth.uid();
$$;

revoke execute on function public.get_my_restaurant_private() from public, anon;
grant execute on function public.get_my_restaurant_private() to authenticated;

drop function if exists public.admin_restaurant_private(uuid[]);
create function public.admin_restaurant_private(p_ids uuid[])
returns table (
  restaurant_id uuid,
  rif text,
  verification_photo_path text,
  phone text,
  whatsapp text,
  instagram text,
  menu_pdf_url text
)
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
    select r.id, r.rif, r.verification_photo_path, r.phone, r.whatsapp, r.instagram, r.menu_pdf_url
    from public.restaurants r
    where r.id = any(p_ids);
end;
$$;

revoke execute on function public.admin_restaurant_private(uuid[]) from public, anon;
grant execute on function public.admin_restaurant_private(uuid[]) to authenticated;

-- Contacto público de un local: lo que cada visitante puede ver según el
-- plan. Dueño y admin ven todo. Sin plan, solo la cocina fantasma entrega el
-- WhatsApp; el resto devuelve todo en null.
create or replace function public.get_restaurant_contact(p_restaurant_id uuid)
returns table (
  whatsapp text,
  instagram text,
  phone text,
  menu_pdf_url text,
  has_plan boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.restaurants;
  v_plan boolean;
  v_priv boolean;
begin
  select * into v_row from public.restaurants r where r.id = p_restaurant_id;
  if not found then
    return;
  end if;

  v_priv := v_row.owner_id is not distinct from auth.uid() or public.is_admin(auth.uid());
  if not v_priv and not (v_row.status = 'approved' and v_row.is_active) then
    return;
  end if;

  v_plan := v_row.founder_rank is not null
         or (v_row.paid_until is not null and v_row.paid_until > now());

  if v_plan or v_priv then
    return query select v_row.whatsapp, v_row.instagram, v_row.phone, v_row.menu_pdf_url, v_plan;
  elsif v_row.ghost_kitchen then
    return query select v_row.whatsapp, null::text, null::text, null::text, v_plan;
  else
    return query select null::text, null::text, null::text, null::text, v_plan;
  end if;
end;
$$;

revoke execute on function public.get_restaurant_contact(uuid) from public;
grant execute on function public.get_restaurant_contact(uuid) to anon, authenticated;

-- ─── 4. Mapa: dice si tiene plan y no entrega fotos si no lo tiene ──────────
drop function if exists public.nearby_restaurants(double precision, double precision, double precision, text);
create function public.nearby_restaurants(
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
  has_plan boolean,
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
    case when p.has_plan then r.cover_url end,
    case when p.has_plan then r.logo_url end,
    case when p.has_plan then r.boost_until end,
    r.founder_rank,
    p.has_plan,
    st_distance(r.location, st_point(user_lng, user_lat)::geography) as distance_m
  from public.restaurants r
  cross join lateral (
    select r.founder_rank is not null
        or (r.paid_until is not null and r.paid_until > now()) as has_plan
  ) p
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
    (p.has_plan and r.boost_until is not null and r.boost_until > now()) desc,
    distance_m
$$;

grant execute on function public.nearby_restaurants(
  double precision, double precision, double precision, text
) to anon, authenticated;

-- ─── 5. Interacciones: también cuenta el toque a un contacto bloqueado ──────
-- Es el gancho para el dueño sin plan: "N personas intentaron escribirte".
alter table public.restaurant_events
  drop constraint if exists restaurant_events_event_type_check;
alter table public.restaurant_events
  add constraint restaurant_events_event_type_check
  check (event_type in ('view', 'whatsapp', 'call', 'directions', 'instagram', 'menu', 'blocked'));

-- ─── 6. Responder reseñas y avisar promos: solo con plan ────────────────────
drop policy if exists "restaurant owner inserts reply" on public.review_replies;
create policy "restaurant owner inserts reply"
  on public.review_replies for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_not_banned()
    and exists (
      select 1
      from public.reviews rv
      join public.restaurants r on r.id = rv.restaurant_id
      where rv.id = review_id
        and r.owner_id = (select auth.uid())
        and public.restaurant_has_plan(r.id)
    )
  );

create or replace function public.notify_favoriters_on_promo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  promo text := nullif(btrim(coalesce(new.promo_text, '')), '');
begin
  if promo is null then
    return null;
  end if;
  if old.promo_text is not distinct from new.promo_text then
    return null;
  end if;
  if new.status <> 'approved' or not new.is_active then
    return null;
  end if;
  -- Sin plan la promo no se muestra, así que tampoco se avisa.
  if not public.restaurant_has_plan(new.id) then
    return null;
  end if;

  insert into public.notifications (recipient_id, type, title, body, data)
  select
    f.user_id,
    'promo',
    new.name || ' tiene una promo',
    left(promo, 100),
    jsonb_build_object('restaurant_id', new.id)
  from public.favorites f
  where f.restaurant_id = new.id;

  return null;
end;
$$;

-- ─── 7. Avisos de vencimiento: ya no se "oculta", baja a perfil básico ──────
create or replace function public.send_subscription_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_days int;
begin
  for r in
    select rest.id, rest.name, rest.owner_id, rest.paid_until
    from public.restaurants rest
    where rest.status = 'approved'
      and rest.founder_rank is null
      and rest.paid_until is not null
      and rest.owner_id is not null
  loop
    v_days := (r.paid_until::date - (now())::date);

    if v_days in (7, 3, 1) then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        r.owner_id,
        'sub_expiring',
        'Tu plan vence en ' || v_days || (case when v_days = 1 then ' día' else ' días' end) || ' · ' || r.name,
        'Renueva para no perder el contacto, el menú, las fotos y las respuestas en tu perfil.',
        jsonb_build_object('restaurant_id', r.id, 'kind', 'subscription', 'days_left', v_days)
      );
    elsif v_days = 0 then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        r.owner_id,
        'sub_expiring',
        'Tu plan vence hoy · ' || r.name,
        'Si no renuevas, mañana tu perfil pasa a básico: sin contacto, menú ni fotos.',
        jsonb_build_object('restaurant_id', r.id, 'kind', 'subscription', 'days_left', 0)
      );
    elsif v_days = -1 then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        r.owner_id,
        'sub_expired',
        'Tu perfil pasó a básico · ' || r.name,
        'Tu plan venció. Tu local sigue en el mapa, pero sin contacto, menú ni fotos. Renueva para recuperarlos.',
        jsonb_build_object('restaurant_id', r.id, 'kind', 'subscription')
      );
    end if;
  end loop;
end;
$$;
