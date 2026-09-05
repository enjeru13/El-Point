-- ─────────────────────────────────────────────────────────────────────────────
-- amenities (reference data, seeded below) — same shape/pattern as categories.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.amenities (
  id smallint primary key,
  slug text not null unique,
  label text not null,
  icon text not null,
  sort_order smallint not null default 0
);

alter table public.amenities enable row level security;

drop policy if exists "amenities are viewable by everyone" on public.amenities;
create policy "amenities are viewable by everyone"
  on public.amenities for select
  using (true);

insert into public.amenities (id, slug, label, icon, sort_order) values
  (1, 'wifi',          'Wifi',                        'wifi',           1),
  (2, 'parking',       'Estacionamiento',             'parking',        2),
  (3, 'air_conditioning', 'Aire acondicionado',       'air-conditioner', 3),
  (4, 'outdoor_seating', 'Terraza / área exterior',   'umbrella',        4),
  (5, 'baby_changing', 'Cambiador de bebé',           'baby-changing',   5),
  (6, 'high_chair',    'Sillas para bebé',            'high-chair',      6),
  (7, 'wheelchair_accessible', 'Acceso para silla de ruedas', 'accessibility', 7),
  (8, 'pet_friendly',  'Pet friendly',                'paw',             8),
  (9, 'cards_accepted', 'Acepta tarjeta',             'credit-card',     9),
  (10, 'cash_only',    'Solo efectivo',               'cash-only',      10)
on conflict (id) do update
  set slug = excluded.slug,
      label = excluded.label,
      icon = excluded.icon,
      sort_order = excluded.sort_order;

grant select on public.amenities to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- restaurant_amenities  (N:M) — mirrors restaurant_categories.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.restaurant_amenities (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  amenity_id smallint not null references public.amenities (id) on delete cascade,
  primary key (restaurant_id, amenity_id)
);

create index if not exists restaurant_amenities_amenity_idx
  on public.restaurant_amenities (amenity_id);

alter table public.restaurant_amenities enable row level security;

drop policy if exists "restaurant_amenities viewable by everyone" on public.restaurant_amenities;
create policy "restaurant_amenities viewable by everyone"
  on public.restaurant_amenities for select
  using (true);

drop policy if exists "owners manage own restaurant amenities (insert)" on public.restaurant_amenities;
create policy "owners manage own restaurant amenities (insert)"
  on public.restaurant_amenities for insert to authenticated
  with check (exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id and r.owner_id = (select auth.uid())
  ));

drop policy if exists "owners manage own restaurant amenities (delete)" on public.restaurant_amenities;
create policy "owners manage own restaurant amenities (delete)"
  on public.restaurant_amenities for delete to authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id and r.owner_id = (select auth.uid())
  ));

grant select on public.restaurant_amenities to anon, authenticated;
grant insert, delete on public.restaurant_amenities to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- create_owner_restaurant: now also accepts amenity ids at signup.
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.create_owner_restaurant(
  text, text, text, double precision, double precision, text, text, smallint[], text, text
);

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
  p_amenity_ids smallint[] default '{}'
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
    rif, verification_photo_path, status
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
    'pending'
  )
  returning id into new_id;

  if p_category_ids is not null then
    foreach cid in array p_category_ids loop
      insert into public.restaurant_categories (restaurant_id, category_id)
      values (new_id, cid)
      on conflict do nothing;
    end loop;
  end if;

  if p_amenity_ids is not null then
    foreach aid in array p_amenity_ids loop
      insert into public.restaurant_amenities (restaurant_id, amenity_id)
      values (new_id, aid)
      on conflict do nothing;
    end loop;
  end if;

  return new_id;
end;
$$;

grant execute on function public.create_owner_restaurant(
  text, text, text, double precision, double precision, text, text, smallint[], text, text, smallint[]
) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- set_restaurant_amenities: atomic replace of an existing restaurant's
-- amenities, for the owner to edit after signup (owners can't otherwise write
-- restaurant_amenities directly except insert/delete one row at a time).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_restaurant_amenities(
  p_restaurant_id uuid,
  p_amenity_ids smallint[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
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

  delete from public.restaurant_amenities
  where restaurant_id = p_restaurant_id
    and (p_amenity_ids is null or amenity_id <> all (p_amenity_ids));

  insert into public.restaurant_amenities (restaurant_id, amenity_id)
  select p_restaurant_id, a
  from unnest(coalesce(p_amenity_ids, '{}')) as a
  on conflict do nothing;
end;
$$;

grant execute on function public.set_restaurant_amenities(uuid, smallint[]) to authenticated;
