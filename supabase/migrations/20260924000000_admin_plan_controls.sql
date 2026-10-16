-- Controles de plan desde el panel de admin, sin tocar la base a mano.
--
-- Hasta ahora el admin solo podía registrar un pago o anular uno registrado.
-- Quitar un plan, regalar días, fijar un vencimiento o quitar el Destacado se
-- hacía con SQL. Esta función lo cubre y deja constancia de quién hizo qué y
-- por qué en plan_adjustments.
--
--   remove        el plan vence ya (el local baja a perfil básico)
--   add_days      suma días (cortesía), desde hoy si ya estaba vencido
--   set_date      fija el vencimiento exacto
--   remove_boost  quita el Destacado
--
-- No se permite sobre Originales: su plan no vence.

create table if not exists public.plan_adjustments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in ('remove', 'add_days', 'set_date', 'remove_boost')),
  old_paid_until timestamptz,
  new_paid_until timestamptz,
  old_boost_until timestamptz,
  new_boost_until timestamptz,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists plan_adjustments_restaurant_idx
  on public.plan_adjustments (restaurant_id, created_at desc);

alter table public.plan_adjustments enable row level security;
revoke all on public.plan_adjustments from anon, authenticated;
grant select on public.plan_adjustments to authenticated;

drop policy if exists "admin reads plan adjustments" on public.plan_adjustments;
create policy "admin reads plan adjustments"
  on public.plan_adjustments for select to authenticated
  using (public.is_admin((select auth.uid())));

create or replace function public.admin_set_plan(
  p_restaurant_id uuid,
  p_action text,
  p_days int default null,
  p_date timestamptz default null,
  p_reason text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_founder smallint;
  v_old_paid timestamptz;
  v_old_boost timestamptz;
  v_new_paid timestamptz;
  v_new_boost timestamptz;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select founder_rank, paid_until, boost_until
    into v_founder, v_old_paid, v_old_boost
  from public.restaurants
  where id = p_restaurant_id
  for update;

  if not found then
    raise exception 'Local no encontrado';
  end if;
  if v_founder is not null then
    raise exception 'Es un local Original: su plan no vence';
  end if;

  v_new_paid := v_old_paid;
  v_new_boost := v_old_boost;

  case p_action
    when 'remove' then
      v_new_paid := now() - interval '1 second';
    when 'add_days' then
      if p_days is null or p_days < 1 or p_days > 730 then
        raise exception 'Los días deben estar entre 1 y 730';
      end if;
      v_new_paid := greatest(coalesce(v_old_paid, now()), now()) + make_interval(days => p_days);
    when 'set_date' then
      if p_date is null then
        raise exception 'Falta la fecha';
      end if;
      v_new_paid := p_date;
    when 'remove_boost' then
      v_new_boost := null;
    else
      raise exception 'Acción no válida';
  end case;

  update public.restaurants
    set paid_until = v_new_paid,
        boost_until = v_new_boost
    where id = p_restaurant_id;

  insert into public.plan_adjustments (
    restaurant_id, admin_id, action,
    old_paid_until, new_paid_until, old_boost_until, new_boost_until, reason
  )
  values (
    p_restaurant_id, auth.uid(), p_action,
    v_old_paid, v_new_paid, v_old_boost, v_new_boost,
    nullif(btrim(coalesce(p_reason, '')), '')
  );

  return v_new_paid;
end;
$$;

revoke execute on function public.admin_set_plan(uuid, text, int, timestamptz, text) from public, anon;
grant execute on function public.admin_set_plan(uuid, text, int, timestamptz, text) to authenticated;
