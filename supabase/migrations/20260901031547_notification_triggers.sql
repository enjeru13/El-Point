-- Server-side notifications:
--   new review        -> notify the restaurant owner
--   "me sirve" (like) -> notify the review author

-- Allow a 'review' notification type.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('like', 'reply', 'levelup', 'levelup_soon', 'promo', 'review'));

-- ── New review -> owner ─────────────────────────────────────────────────────

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

drop trigger if exists trg_notify_owner_on_review on public.reviews;
create trigger trg_notify_owner_on_review
  after insert on public.reviews
  for each row execute function public.notify_owner_on_review();

-- ── "Me sirve" -> review author ─────────────────────────────────────────────

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

drop trigger if exists trg_notify_author_on_helpful on public.review_helpful;
create trigger trg_notify_author_on_helpful
  after insert on public.review_helpful
  for each row execute function public.notify_author_on_helpful();
