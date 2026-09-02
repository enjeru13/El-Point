-- Phase 1 content moderation for reviews.
--
-- Model:
--   * Any authenticated (non-banned) user can report a review once.
--   * If the restaurant owner reports it, OR 3+ distinct users report it,
--     the review is auto-hidden (moderation = 'hidden') pending admin review.
--   * An admin (profiles.is_admin) resolves it back to 'visible' or to
--     'removed'. 'removed' is kept for audit but excluded from ratings and
--     adds a strike to the author; 3 strikes => banned_at set, no more reviews.
--   * Hidden/removed reviews stay visible to their own author and to admins.
--
-- Protected columns (profiles.is_admin/strikes/banned_at,
-- reviews.moderation/moderated_at) can only be changed by the SECURITY DEFINER
-- functions here or by an admin; a guard trigger reverts anything else.

-- ─────────────────────────────────────────────────────────────────────────────
-- Columns
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.reviews
  add column if not exists moderation text not null default 'visible'
    check (moderation in ('visible', 'hidden', 'removed')),
  add column if not exists moderated_at timestamptz;

create index if not exists reviews_moderation_idx
  on public.reviews (moderation)
  where moderation <> 'visible';

alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists strikes integer not null default 0 check (strikes >= 0),
  add column if not exists banned_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- Admin check helper
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = uid), false);
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- review_reports
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null default 'other'
    check (reason in ('offensive', 'spam', 'false', 'other')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);

create index if not exists review_reports_review_idx
  on public.review_reports (review_id);

alter table public.review_reports enable row level security;

drop policy if exists "reporter reads own reports" on public.review_reports;
create policy "reporter reads own reports"
  on public.review_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin((select auth.uid())));

drop policy if exists "users file reports" on public.review_reports;
create policy "users file reports"
  on public.review_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and not exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.banned_at is not null
    )
    and not exists (
      select 1 from public.reviews rv
      where rv.id = review_id and rv.author_id = (select auth.uid())
    )
  );

drop policy if exists "admin clears reports" on public.review_reports;
create policy "admin clears reports"
  on public.review_reports for delete to authenticated
  using (public.is_admin((select auth.uid())));

grant select, insert on public.review_reports to authenticated;
grant delete on public.review_reports to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Guards for protected columns
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.guard_protected_profile_cols()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.elpoint_privileged', true), 'off') = 'on' then
    return new;
  end if;
  -- Non-privileged path (a user editing their own profile): freeze these.
  new.is_admin  := old.is_admin;
  new.strikes   := old.strikes;
  new.banned_at := old.banned_at;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_cols on public.profiles;
create trigger trg_guard_profile_cols
  before update on public.profiles
  for each row execute function public.guard_protected_profile_cols();

create or replace function public.guard_review_moderation_cols()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.elpoint_privileged', true), 'off') = 'on' then
    return new;
  end if;
  if (new.moderation is distinct from old.moderation
      or new.moderated_at is distinct from old.moderated_at)
     and not public.is_admin((select auth.uid())) then
    new.moderation   := old.moderation;
    new.moderated_at := old.moderated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_review_moderation on public.reviews;
create trigger trg_guard_review_moderation
  before update on public.reviews
  for each row execute function public.guard_review_moderation_cols();

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-hide on reports
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.evaluate_review_moderation(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author     uuid;
  v_restaurant uuid;
  v_status     text;
  v_owner      uuid;
  v_distinct   int;
  v_owner_flag boolean;
begin
  select author_id, restaurant_id, moderation
    into v_author, v_restaurant, v_status
  from public.reviews where id = target;

  if v_status is null or v_status <> 'visible' then
    return;
  end if;

  select owner_id into v_owner
  from public.restaurants where id = v_restaurant;

  select count(distinct reporter_id) into v_distinct
  from public.review_reports where review_id = target;

  select exists (
    select 1 from public.review_reports
    where review_id = target and reporter_id = v_owner
  ) into v_owner_flag;

  if v_owner_flag or v_distinct >= 3 then
    perform set_config('app.elpoint_privileged', 'on', true);
    update public.reviews
      set moderation = 'hidden', moderated_at = now()
      where id = target and moderation = 'visible';

    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      v_author,
      'moderation',
      'Tu reseña está en revisión',
      'Recibimos reportes sobre una de tus reseñas. Un moderador la revisará pronto.',
      jsonb_build_object('restaurant_id', v_restaurant, 'review_id', target)
    );
    perform set_config('app.elpoint_privileged', 'off', true);
  end if;
end;
$$;

create or replace function public.on_review_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.evaluate_review_moderation(new.review_id);
  return null;
end;
$$;

drop trigger if exists trg_on_review_report on public.review_reports;
create trigger trg_on_review_report
  after insert on public.review_reports
  for each row execute function public.on_review_report();

-- ─────────────────────────────────────────────────────────────────────────────
-- Strikes / ban when a review is removed
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.on_review_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_strikes int;
begin
  if new.moderation = 'removed' and old.moderation <> 'removed' then
    perform set_config('app.elpoint_privileged', 'on', true);
    update public.profiles
      set strikes = strikes + 1
      where id = new.author_id
      returning strikes into v_strikes;

    if v_strikes >= 3 then
      update public.profiles
        set banned_at = now()
        where id = new.author_id and banned_at is null;
    end if;
    perform set_config('app.elpoint_privileged', 'off', true);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_on_review_removed on public.reviews;
create trigger trg_on_review_removed
  after update of moderation on public.reviews
  for each row execute function public.on_review_removed();

-- ─────────────────────────────────────────────────────────────────────────────
-- Ratings ignore non-visible reviews
-- ─────────────────────────────────────────────────────────────────────────────

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
      and moderation = 'visible'
  ) as agg
  where r.id = target_id;
  return null;
end;
$$;

drop trigger if exists trg_reviews_refresh_rating on public.reviews;
create trigger trg_reviews_refresh_rating
  after insert or update of rating, moderation or delete on public.reviews
  for each row execute function public.refresh_restaurant_rating();

-- Recompute every restaurant once so existing rows reflect the new rule.
update public.restaurants r
set rating_count = agg.cnt,
    rating_avg   = coalesce(agg.avg_rating, 0)
from (
  select restaurant_id,
         count(*)::int as cnt,
         round(avg(rating)::numeric, 1) as avg_rating
  from public.reviews
  where moderation = 'visible'
  group by restaurant_id
) as agg
where r.id = agg.restaurant_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: visibility + admin moderation + ban enforcement
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "reviews are viewable by everyone" on public.reviews;
create policy "reviews are viewable by everyone"
  on public.reviews for select
  using (
    moderation = 'visible'
    or author_id = (select auth.uid())
    or public.is_admin((select auth.uid()))
  );

drop policy if exists "users insert own reviews" on public.reviews;
create policy "users insert own reviews"
  on public.reviews for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and not exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.banned_at is not null
    )
  );

drop policy if exists "admin updates any review" on public.reviews;
create policy "admin updates any review"
  on public.reviews for update to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

drop policy if exists "admin deletes any review" on public.reviews;
create policy "admin deletes any review"
  on public.reviews for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- ─────────────────────────────────────────────────────────────────────────────
-- notifications: allow the 'moderation' type (union of every type in use)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'like', 'reply', 'levelup', 'levelup_soon', 'promo', 'review', 'weekly', 'moderation'
  ));
