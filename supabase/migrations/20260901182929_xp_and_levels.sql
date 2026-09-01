-- Gamification: XP + levels.
--   +10 XP for writing a review
--   +2  XP when someone marks your review helpful
-- Level = xp / 200 + 1. Crossing a level inserts a 'levelup' notification.

create or replace function public.award_xp(p_user uuid, p_amount int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_level int;
  new_xp int;
  new_level int;
begin
  update public.profiles
    set xp = greatest(0, xp + p_amount)
    where id = p_user
    returning xp, level into new_xp, old_level;

  if new_xp is null then
    return;
  end if;

  new_level := greatest(1, (new_xp / 200) + 1);

  if new_level <> old_level then
    update public.profiles set level = new_level where id = p_user;
    if new_level > old_level then
      insert into public.notifications (recipient_id, type, title, body)
      values (
        p_user,
        'levelup',
        '¡Subiste al nivel ' || new_level || '!',
        'Sigue rankeando para desbloquear más.'
      );
    end if;
  end if;
end;
$$;

-- Extend the existing review-insert trigger to also award XP to the author.
create or replace function public.notify_owner_on_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r_name text;
  r_owner uuid;
begin
  perform public.award_xp(new.author_id, 10);

  select name, owner_id into r_name, r_owner
  from public.restaurants where id = new.restaurant_id;

  if r_owner is null or r_owner = new.author_id then
    return null;
  end if;

  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    r_owner,
    'review',
    'Nueva reseña en ' || coalesce(r_name, 'tu local'),
    new.rating || '★ · ' || left(new.body, 80),
    jsonb_build_object('restaurant_id', new.restaurant_id, 'review_id', new.id)
  );
  return null;
end;
$$;

-- Extend the helpful trigger to award XP to the review author.
create or replace function public.notify_author_on_helpful()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rv_author uuid;
  rv_restaurant uuid;
  r_name text;
  actor text;
begin
  select author_id, restaurant_id into rv_author, rv_restaurant
  from public.reviews where id = new.review_id;

  if rv_author is null or rv_author = new.user_id then
    return null;
  end if;

  perform public.award_xp(rv_author, 2);

  select name into r_name from public.restaurants where id = rv_restaurant;
  select coalesce('@' || username, full_name, 'Alguien') into actor
  from public.profiles where id = new.user_id;

  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    rv_author,
    'like',
    actor || ' marcó tu reseña como útil',
    'Tu reseña de ' || coalesce(r_name, 'un local') || ' recibió un "Me sirve".',
    jsonb_build_object('restaurant_id', rv_restaurant, 'review_id', new.review_id)
  );
  return null;
end;
$$;

-- Backfill XP for existing activity.
with earned as (
  select author_id as uid, count(*) * 10 as xp from public.reviews group by author_id
  union all
  select rv.author_id as uid, count(*) * 2 as xp
  from public.review_helpful rh
  join public.reviews rv on rv.id = rh.review_id
  where rv.author_id <> rh.user_id
  group by rv.author_id
),
totals as (
  select uid, sum(xp)::int as xp from earned group by uid
)
update public.profiles p
set xp = t.xp,
    level = greatest(1, (t.xp / 200) + 1)
from totals t
where p.id = t.uid;
