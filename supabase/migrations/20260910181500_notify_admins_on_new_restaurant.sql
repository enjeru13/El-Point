-- Avisar a los moderadores cuando entra un local nuevo a la cola de
-- verificación (creación o reenvío tras rechazo). Antes solo subía el
-- contador del panel; ahora llega al bell (y push, si el admin tiene token).

create or replace function public.notify_admins_on_pending_restaurant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, type, title, body, data)
  select p.id,
         'moderation',
         'Local nuevo por aprobar',
         '"' || new.name || '" está esperando verificación. Revísalo en el panel.',
         jsonb_build_object('restaurant_id', new.id, 'kind', 'new_restaurant')
  from public.profiles p
  where p.is_admin;
  return null;
end;
$$;

drop trigger if exists trg_notify_admins_on_new_restaurant on public.restaurants;
create trigger trg_notify_admins_on_new_restaurant
  after insert on public.restaurants
  for each row
  when (new.status = 'pending')
  execute function public.notify_admins_on_pending_restaurant();

drop trigger if exists trg_notify_admins_on_resubmit_restaurant on public.restaurants;
create trigger trg_notify_admins_on_resubmit_restaurant
  after update of status on public.restaurants
  for each row
  when (new.status = 'pending' and old.status is distinct from 'pending')
  execute function public.notify_admins_on_pending_restaurant();
