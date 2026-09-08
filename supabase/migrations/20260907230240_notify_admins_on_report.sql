-- Ping every admin's in-app bell when a new report lands, so moderation
-- isn't blind polling of the panel. Uses type 'moderation' (unmutable,
-- already an allowed notifications.type). Fires only on the first report of
-- a given review/restaurant to avoid a burst on a pile-on.

create or replace function public.notify_admins_on_review_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_name text;
begin
  select count(*) into v_count
  from public.review_reports where review_id = new.review_id;
  if v_count > 1 then
    return null; -- ya se notificó en el primer reporte
  end if;

  select r.name into v_name
  from public.reviews rv
  join public.restaurants r on r.id = rv.restaurant_id
  where rv.id = new.review_id;

  insert into public.notifications (recipient_id, type, title, body, data)
  select p.id,
         'moderation',
         'Nueva reseña reportada',
         'Reportaron una reseña en ' || coalesce(v_name, 'un local') || '. Revísala en el panel.',
         jsonb_build_object('review_id', new.review_id, 'kind', 'review_report')
  from public.profiles p
  where p.is_admin;
  return null;
end;
$$;

drop trigger if exists trg_notify_admins_on_review_report on public.review_reports;
create trigger trg_notify_admins_on_review_report
  after insert on public.review_reports
  for each row execute function public.notify_admins_on_review_report();

create or replace function public.notify_admins_on_restaurant_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
  v_name text;
begin
  select count(*) into v_count
  from public.restaurant_reports where restaurant_id = new.restaurant_id;
  if v_count > 1 then
    return null;
  end if;

  select name into v_name from public.restaurants where id = new.restaurant_id;

  insert into public.notifications (recipient_id, type, title, body, data)
  select p.id,
         'moderation',
         'Nuevo local reportado',
         'Reportaron ' || coalesce(v_name, 'un local') || '. Revísalo en el panel.',
         jsonb_build_object('restaurant_id', new.restaurant_id, 'kind', 'restaurant_report')
  from public.profiles p
  where p.is_admin;
  return null;
end;
$$;

drop trigger if exists trg_notify_admins_on_restaurant_report on public.restaurant_reports;
create trigger trg_notify_admins_on_restaurant_report
  after insert on public.restaurant_reports
  for each row execute function public.notify_admins_on_restaurant_report();
