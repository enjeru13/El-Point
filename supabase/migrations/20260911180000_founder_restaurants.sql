-- ═══════════════════════════════════════════════════════════════════════════
-- "Fundador" — the first 100 restaurants ever approved get a permanent rank
-- number (1-100) and a badge, free forever. Restaurant #101 onward pays the
-- eventual paid plan (schema for that comes in a later migration once
-- payment details are locked in).
--
--   * restaurants.founder_rank: null for everyone after #100. Set once, by
--     the trigger below, the first time a restaurant is approved — never by
--     the owner or a raw PATCH.
--   * A global advisory lock (not a sequence) keeps concurrent approvals
--     from ever handing out the same rank twice.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.restaurants
  add column if not exists founder_rank smallint unique check (founder_rank between 1 and 100);

comment on column public.restaurants.founder_rank is
  '1-100 for the first restaurants ever approved — permanent, free forever. Set only by assign_founder_rank().';

revoke update (founder_rank) on public.restaurants from anon, authenticated;

create or replace function public.assign_founder_rank()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_taken int;
begin
  if new.status = 'approved'
     and old.status is distinct from 'approved'
     and new.founder_rank is null then
    -- Serialize concurrent approvals so two owners can't both land on #100.
    perform pg_advisory_xact_lock(hashtext('elpoint_founder_rank'));
    select count(*) into v_taken from public.restaurants where founder_rank is not null;
    if v_taken < 100 then
      new.founder_rank := v_taken + 1;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_founder_rank on public.restaurants;
create trigger trg_assign_founder_rank
  before update on public.restaurants
  for each row execute function public.assign_founder_rank();

-- ─── Backfill: restaurants already approved before this migration existed
-- (including the demo seed) — same order they were actually approved in,
-- so the real first ones keep being #1, #2, #3...
do $$
declare
  r record;
  v_taken int;
begin
  select count(*) into v_taken from public.restaurants where founder_rank is not null;
  for r in
    select id
    from public.restaurants
    where status = 'approved' and founder_rank is null
    order by coalesce(reviewed_at, created_at) asc
  loop
    exit when v_taken >= 100;
    update public.restaurants set founder_rank = v_taken + 1 where id = r.id;
    v_taken := v_taken + 1;
  end loop;
end $$;

-- ─── nearby_restaurants: return founder_rank too ─────────────────────────
drop function if exists public.nearby_restaurants(
  double precision, double precision, double precision, text
);

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
  founder_rank smallint,
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
    r.founder_rank,
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

grant execute on function public.nearby_restaurants(
  double precision, double precision, double precision, text
) to anon, authenticated;
