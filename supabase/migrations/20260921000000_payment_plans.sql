-- Planes de pago y registro de pagos hechos FUERA de la app.
--
-- El cobro se hace por WhatsApp (política de las tiendas): el admin registra
-- el pago desde el panel. Cada plan suma tiempo al local y, además, días de
-- Destacado (el Destacado no se vende aparte, viene con el plan):
--   monthly   -> +1 mes  y +3 días de Destacado
--   quarterly -> +3 meses y +7 días
--   annual    -> +1 año  y +21 días

-- ─── restaurant_payments: plan, métodos nuevos, comprobante opcional ────────
alter table public.restaurant_payments
  add column if not exists plan text;

alter table public.restaurant_payments
  drop constraint if exists restaurant_payments_plan_check;
alter table public.restaurant_payments
  add constraint restaurant_payments_plan_check
  check (plan is null or plan in ('monthly', 'quarterly', 'annual'));

alter table public.restaurant_payments
  drop constraint if exists restaurant_payments_method_check;
alter table public.restaurant_payments
  add constraint restaurant_payments_method_check
  check (method in ('bs_bcv', 'binance', 'bancolombia', 'nequi', 'davivienda'));

-- Un pago registrado por el admin no trae foto: se verifica contra el banco.
alter table public.restaurant_payments
  alter column proof_path drop not null;

-- ─── Notificación nueva: plan activado ──────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'like', 'reply', 'levelup', 'levelup_soon', 'promo', 'review', 'weekly',
    'moderation', 'mission', 'streak', 'sub_expiring', 'sub_expired', 'plan_active'
  ));

-- ─── Cuánto suma cada plan ──────────────────────────────────────────────────
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
    set paid_until = greatest(coalesce(paid_until, now()), now()) + v_interval
    where id = p_restaurant_id
    returning paid_until into v_paid;

  perform public.extend_boost(p_restaurant_id, v_boost_days);
  return v_paid;
end;
$$;

revoke execute on function public.apply_payment_plan(uuid, text) from public, anon, authenticated;

-- ─── Admin: registrar un pago ya recibido ───────────────────────────────────
create or replace function public.admin_register_payment(
  p_restaurant_id uuid,
  p_plan text,
  p_method text,
  p_reference text,
  p_amount numeric default null,
  p_note text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_name text;
  v_founder smallint;
  v_paid timestamptz;
  v_ref text := btrim(coalesce(p_reference, ''));
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  if v_ref = '' then
    raise exception 'La referencia es obligatoria';
  end if;

  select owner_id, name, founder_rank into v_owner, v_name, v_founder
  from public.restaurants where id = p_restaurant_id;

  if v_name is null then
    raise exception 'Local no encontrado';
  end if;
  if v_owner is null then
    raise exception 'Este local no tiene dueño asignado';
  end if;
  if v_founder is not null then
    raise exception 'Es un local Original: no paga plan';
  end if;

  -- Evita registrar dos veces la misma referencia del mismo método.
  if exists (
    select 1 from public.restaurant_payments
    where method = p_method and lower(btrim(reference)) = lower(v_ref) and status = 'approved'
  ) then
    raise exception 'Esa referencia ya está registrada';
  end if;

  insert into public.restaurant_payments (
    restaurant_id, owner_id, method, reference, amount, status, note, plan,
    reviewed_at, reviewed_by
  )
  values (
    p_restaurant_id, v_owner, p_method, v_ref, p_amount, 'approved', p_note, p_plan,
    now(), auth.uid()
  );

  v_paid := public.apply_payment_plan(p_restaurant_id, p_plan);

  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    v_owner,
    'plan_active',
    'Tu plan está activo · ' || v_name,
    'Gracias por tu pago. Tu local sigue visible y sumaste días de Destacado.',
    jsonb_build_object('restaurant_id', p_restaurant_id, 'kind', 'subscription', 'plan', p_plan)
  );

  return v_paid;
end;
$$;

revoke execute on function public.admin_register_payment(uuid, text, text, text, numeric, text) from public, anon;
grant execute on function public.admin_register_payment(uuid, text, text, text, numeric, text) to authenticated;

-- ─── Aprobar un comprobante pendiente: ahora también respeta el plan ────────
create or replace function public.admin_resolve_payment(
  p_payment_id uuid,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
  v_plan text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid action';
  end if;

  select restaurant_id, coalesce(plan, 'annual') into v_restaurant_id, v_plan
  from public.restaurant_payments
  where id = p_payment_id and status = 'pending';

  if v_restaurant_id is null then
    raise exception 'payment not found or already resolved';
  end if;

  update public.restaurant_payments
    set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
        note = p_note,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where id = p_payment_id;

  if p_action = 'approve' then
    perform public.apply_payment_plan(v_restaurant_id, v_plan);
  end if;
end;
$$;

grant execute on function public.admin_resolve_payment(uuid, text, text) to authenticated;
