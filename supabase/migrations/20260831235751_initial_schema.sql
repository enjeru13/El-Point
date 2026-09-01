-- El Point — initial schema
-- Tables: profiles, categories, restaurants, restaurant_categories,
--         reviews, review_photos, favorites, review_helpful, notifications
-- Notes:
--  * PostGIS lives in the `extensions` schema on Supabase.
--  * Since 2026-04-28 new public tables are NOT auto-exposed to the Data API,
--    so every table gets explicit GRANTs plus RLS + policies.
--  * `profiles` is written defensively (may already exist from the dashboard).

create extension if not exists postgis;

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared helpers
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles  (1:1 with auth.users)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade
);

alter table public.profiles
  add column if not exists role text not null default 'customer'
    check (role in ('customer', 'restaurant_owner')),
  add column if not exists username text unique,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists search_radius_km smallint not null default 5
    check (search_radius_km between 1 and 15),
  add column if not exists xp integer not null default 0 check (xp >= 0),
  add column if not exists level integer not null default 1 check (level >= 1),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'customer'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- categories  (reference data, seeded below)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.categories (
  id smallint primary key,
  slug text not null unique,
  label text not null,
  icon text not null,
  sort_order smallint not null default 0
);

alter table public.categories enable row level security;

drop policy if exists "categories are viewable by everyone" on public.categories;
create policy "categories are viewable by everyone"
  on public.categories for select
  using (true);

insert into public.categories (id, slug, label, icon, sort_order) values
  ( 1, 'pizza',      'Pizza',          'pizza',                   1),
  ( 2, 'burgers',    'Hamburguesas',   'hamburger',               2),
  ( 3, 'sushi',      'Sushi',          'fish',                    3),
  ( 4, 'tacos',      'Tacos',          'taco',                    4),
  ( 5, 'vegan',      'Vegano',         'leaf',                    5),
  ( 6, 'coffee',     'Café',           'coffee',                  6),
  ( 7, 'desserts',   'Postres',        'ice-cream',               7),
  ( 8, 'finedining', 'Alta Cocina',    'silverware-fork-knife',   8),
  ( 9, 'bbq',        'BBQ',            'grill',                   9),
  (10, 'pasta',      'Pasta',          'noodles',                10),
  (11, 'seafood',    'Mariscos',       'shaker-outline',         11),
  (12, 'fastfood',   'Comida rápida',  'food-variant',           12),
  (13, 'hotdogs',    'Hot Dogs',       'food-hot-dog',           13),
  (14, 'arepas',     'Arepas',         'corn',                   14)
on conflict (id) do update
  set slug = excluded.slug,
      label = excluded.label,
      icon = excluded.icon,
      sort_order = excluded.sort_order;

-- ─────────────────────────────────────────────────────────────────────────────
-- restaurants
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  description text,
  address text,
  location geography(Point, 4326),
  whatsapp text,
  instagram text,
  phone text,
  price_level smallint check (price_level between 1 and 3),
  logo_url text,
  cover_url text,
  menu_pdf_url text,
  hours jsonb,
  is_active boolean not null default true,
  rating_avg numeric(2, 1) not null default 0 check (rating_avg between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurants_location_idx
  on public.restaurants using gist (location);
create index if not exists restaurants_owner_idx
  on public.restaurants (owner_id);

drop trigger if exists trg_restaurants_updated_at on public.restaurants;
create trigger trg_restaurants_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

alter table public.restaurants enable row level security;

drop policy if exists "active restaurants are viewable by everyone" on public.restaurants;
create policy "active restaurants are viewable by everyone"
  on public.restaurants for select
  using (is_active or owner_id = (select auth.uid()));

drop policy if exists "owners insert own restaurants" on public.restaurants;
create policy "owners insert own restaurants"
  on public.restaurants for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "owners update own restaurants" on public.restaurants;
create policy "owners update own restaurants"
  on public.restaurants for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "owners delete own restaurants" on public.restaurants;
create policy "owners delete own restaurants"
  on public.restaurants for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- restaurant_categories  (N:M)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.restaurant_categories (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id smallint not null references public.categories (id) on delete cascade,
  primary key (restaurant_id, category_id)
);

create index if not exists restaurant_categories_category_idx
  on public.restaurant_categories (category_id);

alter table public.restaurant_categories enable row level security;

drop policy if exists "restaurant_categories viewable by everyone" on public.restaurant_categories;
create policy "restaurant_categories viewable by everyone"
  on public.restaurant_categories for select
  using (true);

drop policy if exists "owners manage own restaurant categories (insert)" on public.restaurant_categories;
create policy "owners manage own restaurant categories (insert)"
  on public.restaurant_categories for insert to authenticated
  with check (exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id and r.owner_id = (select auth.uid())
  ));

drop policy if exists "owners manage own restaurant categories (delete)" on public.restaurant_categories;
create policy "owners manage own restaurant categories (delete)"
  on public.restaurant_categories for delete to authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id and r.owner_id = (select auth.uid())
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- reviews  (multiple per user per restaurant allowed)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 500),
  helpful_count integer not null default 0 check (helpful_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_restaurant_idx
  on public.reviews (restaurant_id, created_at desc);
create index if not exists reviews_author_idx
  on public.reviews (author_id, created_at desc);

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Keep restaurants.rating_avg / rating_count in sync.
create or replace function public.refresh_restaurant_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid := coalesce(new.restaurant_id, old.restaurant_id);
begin
  update public.restaurants r
  set rating_count = agg.cnt,
      rating_avg   = coalesce(agg.avg_rating, 0)
  from (
    select count(*)::int as cnt,
           round(avg(rating)::numeric, 1) as avg_rating
    from public.reviews
    where restaurant_id = target_id
  ) as agg
  where r.id = target_id;
  return null;
end;
$$;

drop trigger if exists trg_reviews_refresh_rating on public.reviews;
create trigger trg_reviews_refresh_rating
  after insert or update of rating or delete on public.reviews
  for each row execute function public.refresh_restaurant_rating();

alter table public.reviews enable row level security;

drop policy if exists "reviews are viewable by everyone" on public.reviews;
create policy "reviews are viewable by everyone"
  on public.reviews for select
  using (true);

drop policy if exists "users insert own reviews" on public.reviews;
create policy "users insert own reviews"
  on public.reviews for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "users update own reviews" on public.reviews;
create policy "users update own reviews"
  on public.reviews for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "users delete own reviews" on public.reviews;
create policy "users delete own reviews"
  on public.reviews for delete to authenticated
  using (author_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- review_photos
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  storage_path text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists review_photos_review_idx
  on public.review_photos (review_id, position);

alter table public.review_photos enable row level security;

drop policy if exists "review photos are viewable by everyone" on public.review_photos;
create policy "review photos are viewable by everyone"
  on public.review_photos for select
  using (true);

drop policy if exists "users insert photos on own reviews" on public.review_photos;
create policy "users insert photos on own reviews"
  on public.review_photos for insert to authenticated
  with check (exists (
    select 1 from public.reviews rv
    where rv.id = review_id and rv.author_id = (select auth.uid())
  ));

drop policy if exists "users delete photos on own reviews" on public.review_photos;
create policy "users delete photos on own reviews"
  on public.review_photos for delete to authenticated
  using (exists (
    select 1 from public.reviews rv
    where rv.id = review_id and rv.author_id = (select auth.uid())
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- favorites  (private per user)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

create index if not exists favorites_restaurant_idx
  on public.favorites (restaurant_id);

alter table public.favorites enable row level security;

drop policy if exists "users read own favorites" on public.favorites;
create policy "users read own favorites"
  on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "users add own favorites" on public.favorites;
create policy "users add own favorites"
  on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "users remove own favorites" on public.favorites;
create policy "users remove own favorites"
  on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- review_helpful
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.review_helpful (
  user_id uuid not null references public.profiles (id) on delete cascade,
  review_id uuid not null references public.reviews (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

create index if not exists review_helpful_review_idx
  on public.review_helpful (review_id);

create or replace function public.refresh_review_helpful_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid := coalesce(new.review_id, old.review_id);
begin
  update public.reviews rv
  set helpful_count = (
    select count(*)::int from public.review_helpful where review_id = target_id
  )
  where rv.id = target_id;
  return null;
end;
$$;

drop trigger if exists trg_review_helpful_count on public.review_helpful;
create trigger trg_review_helpful_count
  after insert or delete on public.review_helpful
  for each row execute function public.refresh_review_helpful_count();

alter table public.review_helpful enable row level security;

drop policy if exists "users read own helpful marks" on public.review_helpful;
create policy "users read own helpful marks"
  on public.review_helpful for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "users add own helpful mark" on public.review_helpful;
create policy "users add own helpful mark"
  on public.review_helpful for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "users remove own helpful mark" on public.review_helpful;
create policy "users remove own helpful mark"
  on public.review_helpful for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- notifications  (writes are server-side only for now)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('like', 'reply', 'levelup', 'levelup_soon', 'promo')),
  title text not null,
  body text,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

drop policy if exists "users delete own notifications" on public.notifications;
create policy "users delete own notifications"
  on public.notifications for delete to authenticated
  using (recipient_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- nearby_restaurants  — geo search respecting RLS (security invoker)
-- ─────────────────────────────────────────────────────────────────────────────

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
    st_distance(r.location, st_point(user_lng, user_lat)::geography) as distance_m
  from public.restaurants r
  where r.is_active
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
  order by distance_m
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Data API exposure  (required since 2026-04-28: new public tables are not
-- auto-exposed). RLS above still governs which rows each role can touch.
-- ─────────────────────────────────────────────────────────────────────────────

grant select on public.profiles              to anon, authenticated;
grant update on public.profiles              to authenticated;

grant select on public.categories            to anon, authenticated;

grant select on public.restaurants           to anon, authenticated;
grant insert, update, delete on public.restaurants to authenticated;

grant select on public.restaurant_categories to anon, authenticated;
grant insert, delete on public.restaurant_categories to authenticated;

grant select on public.reviews               to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

grant select on public.review_photos         to anon, authenticated;
grant insert, delete on public.review_photos  to authenticated;

grant select, insert, delete on public.favorites       to authenticated;
grant select, insert, delete on public.review_helpful  to authenticated;

grant select, update, delete on public.notifications   to authenticated;

grant execute on function public.nearby_restaurants(double precision, double precision, double precision, text)
  to anon, authenticated;
