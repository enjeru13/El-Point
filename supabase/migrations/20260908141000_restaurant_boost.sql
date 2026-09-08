-- ═══════════════════════════════════════════════════════════════════════════
-- "Destacado" boost for restaurants.
--
--   * restaurants.boost_until: while it is in the future, the local sorts
--     first in the map (nearby RPC) and in the default browse of Explorar,
--     and shows a "Destacado" badge in the app.
--   * Granted automatically for 14 days the first time a local is approved
--     (this is the "Local Heat" the onboarding copy promises).
--   * Owners cannot touch the column (privilege revoked); only the approval
--     trigger and the admin RPC below can set it.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.restaurants
  add column if not exists boost_until timestamptz;

comment on column public.restaurants.boost_until is
  'While in the future, the local is boosted (sorts first + "Destacado" badge). Set only by grant_boost_on_approval() and admin_set_restaurant_boost().';

-- Owners must not self-grant a boost via a raw PATCH.
revoke update (boost_until) on public.restaurants from anon, authenticated;

-- ─── Auto-grant on first approval ─────────────────────────────────────────
create or replace function public.grant_boost_on_approval()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved'
     and old.status is distinct from 'approved'
     and new.boost_until is null then
    new.boost_until := now() + interval '14 days';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grant_boost_on_approval on public.restaurants;
create trigger trg_grant_boost_on_approval
  before update on public.restaurants
  for each row execute function public.grant_boost_on_approval();

-- ─── Admin: set / extend / clear a boost manually ────────────────────────
create or replace function public.admin_set_restaurant_boost(
  p_restaurant_id uuid,
  p_days integer
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until timestamptz;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  v_until := case when p_days <= 0 then null else now() + make_interval(days => p_days) end;

  update public.restaurants
    set boost_until = v_until
    where id = p_restaurant_id;

  return v_until;
end;
$$;

grant execute on function public.admin_set_restaurant_boost(uuid, integer) to authenticated;

-- ─── nearby_restaurants: return boost_until + sort boosted first ─────────
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
    st_distance(r.location, st_point(user_lng, user_lat)::geography) as distance_m
  from public.restaurants r
  where r.is_active
    and r.status = 'approved'
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
