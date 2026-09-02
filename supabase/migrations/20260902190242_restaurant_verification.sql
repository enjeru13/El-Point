-- Phase 1 restaurant verification + community reports.
--
--   * A new restaurant is created with status = 'pending' and is invisible to
--     the public until an admin approves it.
--   * Admin resolves: 'approved' | 'rejected' (with reason). Owner can fix and
--     resubmit a rejected one.
--   * 3+ distinct community reports auto-move an approved restaurant to
--     'suspended' for admin review.
--   * If the owner edits name/address of an approved restaurant it drops back
--     to 'pending' (re-review).
--
-- Visibility rule everywhere: status = 'approved' AND is_active (the owner's
-- own pause switch). Owners and admins always see the row.

-- ─────────────────────────────────────────────────────────────────────────────
-- Columns
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.restaurants
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  add column if not exists status_reason text,
  add column if not exists submitted_at timestamptz not null default now(),
  add column if not exists reviewed_at timestamptz,
  add column if not exists verification_photo_path text,
  add column if not exists rif text;

-- Everything that already exists was live under the old model → grandfather it.
update public.restaurants set status = 'approved' where status = 'pending';

create index if not exists restaurants_status_idx
  on public.restaurants (status)
  where status <> 'approved';

-- ─────────────────────────────────────────────────────────────────────────────
-- Private bucket for the facade photo (and any future proof)
-- Path convention: "<owner_uid>/<restaurant_id>/facade.<ext>"
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('restaurant-verification', 'restaurant-verification', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "verification owner insert" on storage.objects;
create policy "verification owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'restaurant-verification'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "verification owner update" on storage.objects;
create policy "verification owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'restaurant-verification'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "verification read own or admin" on storage.objects;
create policy "verification read own or admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'restaurant-verification'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_admin((select auth.uid()))
    )
  );

drop policy if exists "verification owner delete" on storage.objects;
create policy "verification owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'restaurant-verification'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: only approved restaurants are public
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "active restaurants are viewable by everyone" on public.restaurants;
create policy "active restaurants are viewable by everyone"
  on public.restaurants for select
  using (
    (status = 'approved' and is_active)
    or owner_id = (select auth.uid())
    or public.is_admin((select auth.uid()))
  );

drop policy if exists "admin updates any restaurant" on public.restaurants;
create policy "admin updates any restaurant"
  on public.restaurants for update to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- ─────────────────────────────────────────────────────────────────────────────
-- Guard: owners can't self-approve; material edits trigger re-review
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.guard_restaurant_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.elpoint_privileged', true), 'off') = 'on'
     or public.is_admin((select auth.uid())) then
    return new;
  end if;

  -- Owner path. A material change to an approved listing forces re-review.
  if old.status = 'approved'
     and (new.name is distinct from old.name
          or new.address is distinct from old.address) then
    new.status := 'pending';
    new.status_reason := null;
    new.submitted_at := now();
    new.reviewed_at := null;
    return new;
  end if;

  -- Otherwise the moderation columns are frozen for owners.
  new.status := old.status;
  new.status_reason := old.status_reason;
  new.submitted_at := old.submitted_at;
  new.reviewed_at := old.reviewed_at;
  return new;
end;
$$;

drop trigger if exists trg_guard_restaurant_status on public.restaurants;
create trigger trg_guard_restaurant_status
  before update on public.restaurants
  for each row execute function public.guard_restaurant_status();

-- ─────────────────────────────────────────────────────────────────────────────
-- restaurant_reports
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.restaurant_reports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null default 'other'
    check (reason in ('nonexistent', 'closed', 'fake_info', 'duplicate', 'other')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (restaurant_id, reporter_id)
);

create index if not exists restaurant_reports_restaurant_idx
  on public.restaurant_reports (restaurant_id);

alter table public.restaurant_reports enable row level security;

drop policy if exists "reporter reads own restaurant reports" on public.restaurant_reports;
create policy "reporter reads own restaurant reports"
  on public.restaurant_reports for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or public.is_admin((select auth.uid()))
  );

drop policy if exists "users file restaurant reports" on public.restaurant_reports;
create policy "users file restaurant reports"
  on public.restaurant_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and not exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.banned_at is not null
    )
  );

drop policy if exists "admin clears restaurant reports" on public.restaurant_reports;
create policy "admin clears restaurant reports"
  on public.restaurant_reports for delete to authenticated
  using (public.is_admin((select auth.uid())));

grant select, insert on public.restaurant_reports to authenticated;
grant delete on public.restaurant_reports to authenticated;

create or replace function public.evaluate_restaurant_reports(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_distinct int;
begin
  select status into v_status from public.restaurants where id = target;
  if v_status is null or v_status <> 'approved' then
    return;
  end if;

  select count(distinct reporter_id) into v_distinct
  from public.restaurant_reports where restaurant_id = target;

  if v_distinct >= 3 then
    perform set_config('app.elpoint_privileged', 'on', true);
    update public.restaurants
      set status = 'suspended',
          status_reason = 'Suspendido por reportes de la comunidad',
          reviewed_at = now()
      where id = target and status = 'approved';
    perform set_config('app.elpoint_privileged', 'off', true);
  end if;
end;
$$;

create or replace function public.on_restaurant_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.evaluate_restaurant_reports(new.restaurant_id);
  return null;
end;
$$;

drop trigger if exists trg_on_restaurant_report on public.restaurant_reports;
create trigger trg_on_restaurant_report
  after insert on public.restaurant_reports
  for each row execute function public.on_restaurant_report();

-- ─────────────────────────────────────────────────────────────────────────────
-- Notify the owner on every status change
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.on_restaurant_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_body text;
begin
  if new.status = old.status or new.owner_id is null then
    return null;
  end if;

  if new.status = 'approved' then
    v_title := '¡Tu local fue aprobado!';
    v_body := new.name || ' ya aparece en El Point.';
  elsif new.status = 'rejected' then
    v_title := 'No pudimos aprobar tu local';
    v_body := coalesce(new.status_reason, 'Revisa los datos y vuelve a enviarlo.');
  elsif new.status = 'suspended' then
    v_title := 'Tu local fue suspendido';
    v_body := coalesce(new.status_reason, 'Escríbenos para resolverlo.');
  elsif new.status = 'pending' and old.status = 'approved' then
    v_title := 'Tu local volvió a revisión';
    v_body := 'Editaste datos clave; lo revisaremos de nuevo.';
  else
    return null;
  end if;

  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    new.owner_id,
    'moderation',
    v_title,
    v_body,
    jsonb_build_object('restaurant_id', new.id, 'status', new.status)
  );
  return null;
end;
$$;

drop trigger if exists trg_on_restaurant_status_change on public.restaurants;
create trigger trg_on_restaurant_status_change
  after update of status on public.restaurants
  for each row execute function public.on_restaurant_status_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- Geo search: only approved
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
  order by distance_m
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- create_owner_restaurant: now takes RIF + facade photo, stays 'pending',
-- refuses banned owners and a second simultaneous pending listing.
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.create_owner_restaurant(
  text, text, text, double precision, double precision, text, text, smallint[]
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
  p_verification_photo_path text default null
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

  return new_id;
end;
$$;

grant execute on function public.create_owner_restaurant(
  text, text, text, double precision, double precision, text, text, smallint[], text, text
) to authenticated;

-- Owner re-submits a rejected listing after fixing it.
create or replace function public.resubmit_restaurant(p_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.restaurants
    set status = 'pending',
        status_reason = null,
        submitted_at = now(),
        reviewed_at = null
    where id = p_restaurant_id
      and owner_id = uid
      and status = 'rejected';
  perform set_config('app.elpoint_privileged', 'off', true);
end;
$$;

grant execute on function public.resubmit_restaurant(uuid) to authenticated;
