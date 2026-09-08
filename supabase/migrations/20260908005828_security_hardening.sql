-- ═══════════════════════════════════════════════════════════════════════════
-- Security hardening pass (pre closed-testing).
--
-- Fixes:
--   1. profiles: role / xp / level were user-editable via a raw PATCH
--      (guard only froze is_admin/strikes/banned_at).
--   2. restaurants: rating_avg / rating_count were owner-editable (fake 5★).
--   3. reviews: helpful_count / xp_reverted / author_id / created_at were
--      author-editable (fake "útil", XP-clawback bypass).
--   4. restaurants: a raw INSERT bypassed the verification flow entirely
--      (could create an already-'approved' public listing). Creation is now
--      RPC-only; the RPC forces status='pending'.
--   5. reviews: no cap → review-spam + XP farming. One review per
--      (author, restaurant); banned users blocked from writing.
--   6. banned users could still post replies / photos / helpful marks.
--   7. support_messages: no rate limit.
--   8. profiles.bio had no length limit.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. profiles: freeze role / xp / level too ─────────────────────────────
create or replace function public.guard_protected_profile_cols()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  new.is_admin  := old.is_admin;
  new.strikes   := old.strikes;
  new.banned_at := old.banned_at;
  new.role      := old.role;
  new.xp        := old.xp;
  new.level     := old.level;
  return new;
end;
$$;

alter table public.profiles
  drop constraint if exists profiles_bio_len,
  add constraint profiles_bio_len
    check (bio is null or char_length(bio) <= 300);

-- ─── 2. restaurants: freeze derived rating columns for owners ──────────────
create or replace function public.guard_restaurant_derived_cols()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  new.rating_avg   := old.rating_avg;
  new.rating_count := old.rating_count;
  return new;
end;
$$;

drop trigger if exists trg_guard_restaurant_derived on public.restaurants;
create trigger trg_guard_restaurant_derived
  before update on public.restaurants
  for each row execute function public.guard_restaurant_derived_cols();

-- ─── 3. reviews: freeze author-controlled derived / identity columns ──────
create or replace function public.guard_review_cols()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  new.helpful_count := old.helpful_count;
  new.xp_reverted   := old.xp_reverted;
  new.author_id     := old.author_id;
  new.restaurant_id := old.restaurant_id;
  new.created_at    := old.created_at;
  return new;
end;
$$;

drop trigger if exists trg_guard_review_cols on public.reviews;
create trigger trg_guard_review_cols
  before update on public.reviews
  for each row execute function public.guard_review_cols();

-- ─── 4. restaurants: creation is RPC-only, always 'pending' ───────────────
-- The RPC already validates uid / banned / one-pending and hardcodes
-- status='pending'. Making it SECURITY DEFINER lets it insert after the
-- direct INSERT privilege is revoked below.
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
  text, text, text, double precision, double precision, text, text, smallint[], text, text, smallint[]
) to authenticated;

revoke insert on public.restaurants from authenticated, anon;

drop policy if exists "owners insert own restaurants" on public.restaurants;

-- ─── 5. reviews: one per (author, restaurant) + block banned writers ─────
alter table public.reviews
  drop constraint if exists reviews_one_per_author_restaurant,
  add constraint reviews_one_per_author_restaurant unique (restaurant_id, author_id);

create or replace function public.is_not_banned()
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.banned_at is not null
  );
$$;

drop policy if exists "users insert own reviews" on public.reviews;
create policy "users insert own reviews"
  on public.reviews for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_not_banned());

-- ─── 6. block banned users from replies / photos / helpful marks ─────────
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
      where rv.id = review_id and r.owner_id = (select auth.uid())
    )
  );

drop policy if exists "users insert photos on own reviews" on public.review_photos;
create policy "users insert photos on own reviews"
  on public.review_photos for insert to authenticated
  with check (
    public.is_not_banned()
    and exists (
      select 1 from public.reviews rv
      where rv.id = review_id and rv.author_id = (select auth.uid())
    )
  );

drop policy if exists "users add own helpful mark" on public.review_helpful;
create policy "users add own helpful mark"
  on public.review_helpful for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_not_banned());

-- ─── 7. support_messages: light rate limit ──────────────────────────────
create or replace function public.guard_support_message_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.support_messages
    where user_id = new.user_id
      and created_at > now() - interval '20 seconds'
  ) then
    raise exception 'Espera un momento antes de enviar otro mensaje.';
  end if;
  if (
    select count(*) from public.support_messages
    where user_id = new.user_id and status = 'open'
  ) >= 5 then
    raise exception 'Ya tienes varios mensajes abiertos. Espera nuestra respuesta.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_support_message_rate on public.support_messages;
create trigger trg_guard_support_message_rate
  before insert on public.support_messages
  for each row execute function public.guard_support_message_rate();
