-- Anular un pago ya aprobado (por ejemplo, uno registrado por error).
--
-- Antes, borrar el pago a mano dejaba el plan activo: el vencimiento
-- (restaurants.paid_until) y los días de Destacado (boost_until) quedaban
-- como si el pago siguiera valiendo. Ahora el pago se marca como anulado y se
-- le resta al local exactamente lo que había sumado.
--
-- No se borra la fila: queda en el historial con quién y cuándo lo anuló.

alter table public.restaurant_payments
  drop constraint if exists restaurant_payments_status_check;
alter table public.restaurant_payments
  add constraint restaurant_payments_status_check
  check (status in ('pending', 'approved', 'rejected', 'voided'));

alter table public.restaurant_payments
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles (id);

create or replace function public.admin_void_payment(
  p_payment_id uuid,
  p_reason text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
  v_plan text;
  v_interval interval;
  v_boost_days int;
  v_paid timestamptz;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select restaurant_id, coalesce(plan, 'annual')
    into v_restaurant_id, v_plan
  from public.restaurant_payments
  where id = p_payment_id and status = 'approved'
  for update;

  if v_restaurant_id is null then
    raise exception 'Solo se pueden anular pagos aprobados';
  end if;

  -- Mismos valores que apply_payment_plan().
  case v_plan
    when 'monthly'   then v_interval := interval '1 month';  v_boost_days := 3;
    when 'quarterly' then v_interval := interval '3 months'; v_boost_days := 7;
    else                  v_interval := interval '1 year';   v_boost_days := 21;
  end case;

  update public.restaurants
    set paid_until = paid_until - v_interval,
        boost_until = case
          when boost_until is not null
           and boost_until - make_interval(days => v_boost_days) > now()
          then boost_until - make_interval(days => v_boost_days)
          else null
        end
    where id = v_restaurant_id
      and founder_rank is null
      and paid_until is not null
    returning paid_until into v_paid;

  update public.restaurant_payments
    set status = 'voided',
        voided_at = now(),
        voided_by = auth.uid(),
        note = concat_ws(' · ', nullif(note, ''), 'Anulado: ' || coalesce(nullif(btrim(p_reason), ''), 'sin motivo'))
    where id = p_payment_id;

  return v_paid;
end;
$$;

revoke execute on function public.admin_void_payment(uuid, text) from public, anon;
grant execute on function public.admin_void_payment(uuid, text) to authenticated;
