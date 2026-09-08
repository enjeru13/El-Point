-- ═══════════════════════════════════════════════════════════════════════════
-- Gamification round 2: one-time missions, weekly review streaks (comensal),
-- and an earned boost for good-host owners.
--
--   * user_missions: unlockable achievements, each worth flat XP + a badge.
--   * profiles.streak_weeks: consecutive ISO weeks with >= 1 review. A weekly
--     pg_cron job advances or breaks it and drops bonus XP.
--   * restaurants.host_streak_weeks: consecutive weeks where the owner replied
--     to every review that had time to be replied to. 4 good weeks => +7 days
--     of "Destacado". A fully completed profile also grants +7 days once.
--
-- All XP writes go through award_xp() (SECURITY DEFINER, already guard-exempt).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── notifications: allow the new types ─────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'like', 'reply', 'levelup', 'levelup_soon', 'promo', 'review', 'weekly',
    'moderation', 'mission', 'streak'
  ));

create or replace function public.push_setting_key(p_type text)
returns text
language sql
immutable
as $$
  select case p_type
    when 'like'    then 'notifRanks'
    when 'reply'   then 'notifReplies'
    when 'review'  then 'notifReviews'
    when 'levelup' then 'notifLevelup'
    when 'mission' then 'notifLevelup'
    when 'streak'  then 'notifLevelup'
    when 'promo'   then 'notifPromos'
    when 'weekly'  then 'notifWeekly'
    else null            -- 'moderation' and anything else: always push
  end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. MISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.user_missions (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  mission   text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, mission)
);

alter table public.user_missions enable row level security;

-- Badges are public: anyone signed in can read them (e.g. on another profile).
drop policy if exists "missions readable" on public.user_missions;
create policy "missions readable"
  on public.user_missions for select to authenticated
  using (true);

-- No insert/update/delete grant: only the SECURITY DEFINER evaluator writes.
grant select on public.user_missions to authenticated;

create or replace function public.mission_xp(p_mission text)
returns int
language sql
immutable
as $$
  select case p_mission
    when 'first_review'  then 20
    when 'photo_review'  then 25
    when 'five_places'   then 60
    when 'ten_helpful'   then 60
    when 'streak_4'      then 100
    when 'explorer_15'   then 150
    else 0
  end;
$$;

create or replace function public.mission_title(p_mission text)
returns text
language sql
immutable
as $$
  select case p_mission
    when 'first_review'  then 'Primera reseña'
    when 'photo_review'  then 'Reseña con foto'
    when 'five_places'   then '5 locales distintos'
    when 'ten_helpful'   then '10 "me sirve" recibidos'
    when 'streak_4'      then 'Un mes en racha'
    when 'explorer_15'   then 'Explorador: 15 locales'
    else p_mission
  end;
$$;

grant execute on function public.mission_xp(text)    to anon, authenticated;
grant execute on function public.mission_title(text) to anon, authenticated;

-- Grant one mission if not already earned: insert badge, award XP, notify.
create or replace function public.grant_mission(p_user uuid, p_mission text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows int := 0;
begin
  insert into public.user_missions (user_id, mission)
  values (p_user, p_mission)
  on conflict do nothing;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return;
  end if;

  perform public.award_xp(p_user, public.mission_xp(p_mission));

  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    p_user,
    'mission',
    'Misión cumplida: ' || public.mission_title(p_mission),
    '+' || public.mission_xp(p_mission) || ' XP. Toca para ver tus logros.',
    jsonb_build_object('kind', 'mission', 'mission', p_mission)
  );
end;
$$;

-- Re-evaluate every mission that depends on review / helpful activity.
create or replace function public.evaluate_user_missions(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviews      int;
  v_distinct     int;
  v_with_photo   int;
  v_helpful_recv int;
begin
  select count(*),
         count(distinct restaurant_id)
    into v_reviews, v_distinct
  from public.reviews
  where author_id = p_user and moderation <> 'removed';

  select count(*) into v_with_photo
  from public.reviews rv
  where rv.author_id = p_user
    and rv.moderation <> 'removed'
    and exists (select 1 from public.review_photos p where p.review_id = rv.id);

  select count(*) into v_helpful_recv
  from public.review_helpful rh
  where rh.review_author_id = p_user and rh.review_author_id <> rh.user_id;

  if v_reviews    >= 1  then perform public.grant_mission(p_user, 'first_review'); end if;
  if v_with_photo >= 1  then perform public.grant_mission(p_user, 'photo_review'); end if;
  if v_distinct   >= 5  then perform public.grant_mission(p_user, 'five_places');  end if;
  if v_distinct   >= 15 then perform public.grant_mission(p_user, 'explorer_15');  end if;
  if v_helpful_recv >= 10 then perform public.grant_mission(p_user, 'ten_helpful'); end if;
end;
$$;

grant execute on function public.evaluate_user_missions(uuid) to authenticated;

-- Hook: after a review is inserted, re-check the author's missions.
create or replace function public.on_review_check_missions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.evaluate_user_missions(new.author_id);
  return null;
end;
$$;

drop trigger if exists trg_on_review_check_missions on public.reviews;
create trigger trg_on_review_check_missions
  after insert on public.reviews
  for each row execute function public.on_review_check_missions();

-- Hook: after a "me sirve" mark, re-check the review author's missions.
create or replace function public.on_helpful_check_missions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.review_author_id is not null and new.review_author_id <> new.user_id then
    perform public.evaluate_user_missions(new.review_author_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_on_helpful_check_missions on public.review_helpful;
create trigger trg_on_helpful_check_missions
  after insert on public.review_helpful
  for each row execute function public.on_helpful_check_missions();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. WEEKLY REVIEW STREAK (comensal)
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists streak_weeks      int  not null default 0,
  add column if not exists streak_best       int  not null default 0,
  add column if not exists streak_week_start date;

-- Runs every Monday for the week that just ended (previous Mon..Sun).
create or replace function public.evaluate_review_streaks()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week_start date := (date_trunc('week', now()) - interval '7 days')::date;
  v_prev_start date := v_week_start - 7;
  r record;
  v_new_weeks int;
begin
  -- Advance streaks for everyone who reviewed during the ended week.
  for r in
    select author_id as uid, count(*) as n
    from public.reviews
    where created_at >= v_week_start
      and created_at <  v_week_start + 7
      and moderation <> 'removed'
    group by author_id
  loop
    select case
             when p.streak_week_start = v_prev_start then p.streak_weeks + 1
             when p.streak_week_start = v_week_start  then p.streak_weeks     -- already counted
             else 1
           end
      into v_new_weeks
    from public.profiles p where p.id = r.uid;

    update public.profiles
      set streak_weeks     = v_new_weeks,
          streak_best      = greatest(streak_best, v_new_weeks),
          streak_week_start = v_week_start
      where id = r.uid;

    -- Weekly bonus XP once the streak is meaningful.
    if v_new_weeks >= 2 then
      perform public.award_xp(r.uid, 15);
    end if;

    -- Milestone notifications + the streak_4 mission.
    if v_new_weeks in (2, 4, 8, 12) then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        r.uid,
        'streak',
        v_new_weeks || ' semanas seguidas rankeando 🔥',
        case
          when v_new_weeks = 4 then '¡Un mes completo! Desbloqueaste una misión.'
          else 'Sigue así para mantener tu racha y ganar XP extra.'
        end,
        jsonb_build_object('kind', 'streak', 'weeks', v_new_weeks)
      );
    end if;

    if v_new_weeks >= 4 then
      perform public.grant_mission(r.uid, 'streak_4');
    end if;
  end loop;

  -- Break streaks for people who had one but didn't review in the ended week.
  for r in
    select id as uid
    from public.profiles
    where streak_weeks > 0
      and coalesce(streak_week_start, date '1970-01-01') < v_week_start
  loop
    update public.profiles set streak_weeks = 0 where id = r.uid;
    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      r.uid,
      'streak',
      'Se acabó tu racha',
      'No dejaste reseñas la semana pasada. Empieza una nueva racha esta semana.',
      jsonb_build_object('kind', 'streak', 'weeks', 0)
    );
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. EARNED BOOST (owner)
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.restaurants
  add column if not exists host_streak_weeks     int     not null default 0,
  add column if not exists boost_profile_awarded boolean not null default false;

-- Extend (never shorten) a boost by N days from whichever is later: now or the
-- current boost_until.
create or replace function public.extend_boost(p_restaurant_id uuid, p_days int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.restaurants
    set boost_until = greatest(coalesce(boost_until, now()), now()) + make_interval(days => p_days)
    where id = p_restaurant_id;
end;
$$;

-- A "complete" profile: logo, cover, description, address, a contact, >=1
-- category and >=1 amenity.
create or replace function public.restaurant_profile_complete(p_id uuid)
returns boolean
language sql
stable
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

grant execute on function public.restaurant_profile_complete(uuid) to authenticated;

-- After an owner edits their local: first time it is complete + approved,
-- grant a one-off +7 days of Destacado.
create or replace function public.on_restaurant_profile_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.boost_profile_awarded
     and new.status = 'approved'
     and public.restaurant_profile_complete(new.id) then
    -- Marca ANTES de extender el boost: extend_boost hace otro UPDATE que
    -- re-dispara este trigger; con la bandera ya en true, corta la recursión.
    update public.restaurants set boost_profile_awarded = true where id = new.id;
    perform public.extend_boost(new.id, 7);
    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      new.owner_id,
      'streak',
      'Perfil completo: +7 días Destacado',
      'Tu local tiene todo listo. Lo pusimos Destacado 7 días más.',
      jsonb_build_object('kind', 'owner_boost', 'restaurant_id', new.id)
    );
  end if;
  return null;
end;
$$;

drop trigger if exists trg_on_restaurant_profile_complete on public.restaurants;
create trigger trg_on_restaurant_profile_complete
  after update on public.restaurants
  for each row execute function public.on_restaurant_profile_complete();

-- Weekly: reward owners who replied to every "replyable" review of the ended
-- week (received, and at least 24h old so they had a fair chance).
create or replace function public.evaluate_host_streaks()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week_start date := (date_trunc('week', now()) - interval '7 days')::date;
  r record;
  v_total int;
  v_replied int;
  v_new_weeks int;
begin
  for r in
    select id, owner_id, name
    from public.restaurants
    where status = 'approved' and owner_id is not null
  loop
    select count(*),
           count(*) filter (where exists (
             select 1 from public.review_replies rr where rr.review_id = rv.id
           ))
      into v_total, v_replied
    from public.reviews rv
    where rv.restaurant_id = r.id
      and rv.created_at >= v_week_start
      and rv.created_at <  v_week_start + 7
      and rv.created_at <  now() - interval '24 hours'
      and rv.moderation <> 'removed';

    if v_total = 0 then
      continue;                       -- no activity: streak unchanged
    end if;

    if v_replied = v_total then
      v_new_weeks := r.host_streak_weeks + 1;
      update public.restaurants set host_streak_weeks = v_new_weeks where id = r.id;
      perform public.extend_boost(r.id, 2);

      if v_new_weeks % 4 = 0 then
        perform public.extend_boost(r.id, 7);
        insert into public.notifications (recipient_id, type, title, body, data)
        values (
          r.owner_id, 'streak',
          'Buen anfitrión: +7 días Destacado',
          v_new_weeks || ' semanas respondiendo todas las reseñas. ¡Gracias!',
          jsonb_build_object('kind', 'owner_boost', 'restaurant_id', r.id)
        );
      else
        insert into public.notifications (recipient_id, type, title, body, data)
        values (
          r.owner_id, 'streak',
          'Respondiste todas tus reseñas (+2 días Destacado)',
          'Semana ' || v_new_weeks || ' de tu racha de buen anfitrión.',
          jsonb_build_object('kind', 'owner_boost', 'restaurant_id', r.id)
        );
      end if;
    else
      if r.host_streak_weeks > 0 then
        update public.restaurants set host_streak_weeks = 0 where id = r.id;
      end if;
    end if;
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. SCHEDULE (idempotent) — needs pg_cron
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  perform cron.unschedule('weekly-review-streaks')
  where exists (select 1 from cron.job where jobname = 'weekly-review-streaks');
  perform cron.unschedule('weekly-host-streaks')
  where exists (select 1 from cron.job where jobname = 'weekly-host-streaks');

  perform cron.schedule(
    'weekly-review-streaks',
    '0 14 * * 1',                      -- Mondays 14:00 UTC (~10:00 Venezuela)
    $cron$ select public.evaluate_review_streaks(); $cron$
  );
  perform cron.schedule(
    'weekly-host-streaks',
    '15 14 * * 1',
    $cron$ select public.evaluate_host_streaks(); $cron$
  );
exception
  when undefined_table or undefined_function or insufficient_privilege then
    raise notice 'pg_cron not available — enable the extension, then re-run this migration.';
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. BACKFILL missions for existing activity (DB is otherwise wiped, cheap).
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare u record;
begin
  for u in select distinct author_id as uid from public.reviews loop
    perform public.evaluate_user_missions(u.uid);
  end loop;
end;
$$;
