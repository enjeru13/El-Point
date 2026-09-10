-- Fix: on_restaurant_profile_complete() insertaba una notificación con
-- recipient_id = new.owner_id sin verificar que el local tuviera dueño.
-- En producción todo local aprobado tiene owner (se crea vía
-- create_owner_restaurant), pero un local sin dueño (p. ej. cargado a mano)
-- rompía cualquier UPDATE sobre restaurants con NOT NULL violation.

create or replace function public.on_restaurant_profile_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is not null
     and not new.boost_profile_awarded
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
