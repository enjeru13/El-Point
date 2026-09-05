-- Notify a restaurant's favoriters when it sets/changes its promo. 'promo'
-- was already an allowed notifications.type (added in an earlier migration,
-- never actually produced until now) — no constraint change needed.

create or replace function public.notify_favoriters_on_promo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  promo text := nullif(btrim(coalesce(new.promo_text, '')), '');
begin
  if promo is null then
    return null;
  end if;
  if old.promo_text is not distinct from new.promo_text then
    return null;
  end if;
  if new.status <> 'approved' or not new.is_active then
    return null;
  end if;

  insert into public.notifications (recipient_id, type, title, body, data)
  select
    f.user_id,
    'promo',
    new.name || ' tiene una promo',
    left(promo, 100),
    jsonb_build_object('restaurant_id', new.id)
  from public.favorites f
  where f.restaurant_id = new.id;

  return null;
end;
$$;

drop trigger if exists trg_notify_favoriters_on_promo on public.restaurants;
create trigger trg_notify_favoriters_on_promo
  after update of promo_text on public.restaurants
  for each row execute function public.notify_favoriters_on_promo();
