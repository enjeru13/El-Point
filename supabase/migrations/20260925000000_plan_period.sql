-- Inicio y tipo del periodo de plan vigente, para mostrar la barra de días
-- exacta y el nombre del plan ("mensual", "anual", "prueba gratis"…).
--
--   plan_period_start  cuándo empezó la cobertura continua actual. Si el dueño
--                      paga con el plan todavía vigente, el inicio no cambia
--                      (se suma al final); si ya había vencido, empieza hoy.
--   plan_kind          tipo del último periodo: trial, monthly, quarterly,
--                      annual, courtesy (días regalados) o manual (fecha fijada).
--
-- Los Originales no usan ninguna de las dos.

alter table public.restaurants
  add column if not exists plan_period_start timestamptz,
  add column if not exists plan_kind text;

alter table public.restaurants
  drop constraint if exists restaurants_plan_kind_valid;
alter table public.restaurants
  add constraint restaurants_plan_kind_valid
  check (plan_kind is null or plan_kind in ('trial', 'monthly', 'quarterly', 'annual', 'courtesy', 'manual'));

revoke update (plan_period_start, plan_kind) on public.restaurants from anon, authenticated;
grant select (plan_period_start, plan_kind) on public.restaurants to anon, authenticated;

-- ─── Relleno de lo que ya existe ─────────────────────────────────────────────
-- Sin pagos: es la prueba (empezó con el registro). Con pagos: el del último
-- pago aprobado. Es una aproximación para los datos anteriores; de aquí en
-- adelante se guarda exacto.
update public.restaurants r
set plan_kind = coalesce(lp.plan, case when lp.id is not null then 'annual' end, 'trial'),
    plan_period_start = least(
      coalesce(lp.submitted_at, r.submitted_at, r.created_at),
      r.paid_until - interval '1 day'
    )
from (
  select r2.id as rid, p.id, p.plan, p.submitted_at
  from public.restaurants r2
  left join lateral (
    select id, plan, submitted_at
    from public.restaurant_payments
    where restaurant_id = r2.id and status = 'approved'
    order by submitted_at desc
    limit 1
  ) p on true
) lp
where lp.rid = r.id
  and r.founder_rank is null
  and r.paid_until is not null
  and r.plan_period_start is null;

-- ─── La prueba al aprobar ────────────────────────────────────────────────────
create or replace function public.grant_trial_on_approval()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved'
     and old.status is distinct from 'approved'
     and new.founder_rank is null
     and new.paid_until is null then
    -- 3 meses desde el registro (submitted_at), no desde la aprobación:
    -- así una revisión lenta no le regala tiempo extra a nadie.
    new.paid_until := new.submitted_at + interval '3 months';
    new.plan_period_start := new.submitted_at;
    new.plan_kind := 'trial';
  end if;
  return new;
end;
$$;

-- ─── Un pago suma tiempo ─────────────────────────────────────────────────────
create or replace function public.apply_payment_plan(
  p_restaurant_id uuid,
  p_plan text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_interval interval;
  v_boost_days int;
  v_paid timestamptz;
begin
  case p_plan
    when 'monthly'   then v_interval := interval '1 month';  v_boost_days := 3;
    when 'quarterly' then v_interval := interval '3 months'; v_boost_days := 7;
    when 'annual'    then v_interval := interval '1 year';   v_boost_days := 21;
    else raise exception 'invalid plan';
  end case;

  update public.restaurants
    set plan_period_start = case
          when paid_until is null or paid_until <= now() then now()
          else coalesce(plan_period_start, now())
        end,
        plan_kind = p_plan,
        paid_until = greatest(coalesce(paid_until, now()), now()) + v_interval
    where id = p_restaurant_id
    returning paid_until into v_paid;

  perform public.extend_boost(p_restaurant_id, v_boost_days);
  return v_paid;
end;
$$;

revoke execute on function public.apply_payment_plan(uuid, text) from public, anon, authenticated;

-- ─── Ajustes del admin ───────────────────────────────────────────────────────
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
  v_old_start timestamptz;
  v_old_kind text;
  v_new_paid timestamptz;
  v_new_boost timestamptz;
  v_new_start timestamptz;
  v_new_kind text;
  v_lapsed boolean;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select founder_rank, paid_until, boost_until, plan_period_start, plan_kind
    into v_founder, v_old_paid, v_old_boost, v_old_start, v_old_kind
  from public.restaurants
  where id = p_restaurant_id
  for update;

  if not found then
    raise exception 'Local no encontrado';
  end if;
  if v_founder is not null then
    raise exception 'Es un local Original: su plan no vence';
  end if;

  v_lapsed := v_old_paid is null or v_old_paid <= now();
  v_new_paid := v_old_paid;
  v_new_boost := v_old_boost;
  v_new_start := v_old_start;
  v_new_kind := v_old_kind;

  case p_action
    when 'remove' then
      v_new_paid := now() - interval '1 second';
    when 'add_days' then
      if p_days is null or p_days < 1 or p_days > 730 then
        raise exception 'Los días deben estar entre 1 y 730';
      end if;
      v_new_paid := greatest(coalesce(v_old_paid, now()), now()) + make_interval(days => p_days);
      if v_lapsed then
        v_new_start := now();
        v_new_kind := 'courtesy';
      end if;
    when 'set_date' then
      if p_date is null then
        raise exception 'Falta la fecha';
      end if;
      v_new_paid := p_date;
      if v_lapsed and p_date > now() then
        v_new_start := now();
        v_new_kind := 'manual';
      end if;
    when 'remove_boost' then
      v_new_boost := null;
    else
      raise exception 'Acción no válida';
  end case;

  update public.restaurants
    set paid_until = v_new_paid,
        boost_until = v_new_boost,
        plan_period_start = v_new_start,
        plan_kind = v_new_kind
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
