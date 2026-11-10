-- Aprobar un local desde el panel no le daba Original, prueba ni Destacado.
--
-- El panel aprueba con un UPDATE directo (rol authenticated). Desde
-- 20261105030000 la guarda de columnas protegidas es SECURITY INVOKER, así que
-- para ese UPDATE no es "de confianza" y, al correr después de los triggers de
-- aprobación (orden alfabético: assign/grant < guard), devolvía founder_rank,
-- paid_until, plan_kind, plan_period_start y boost_until a su valor anterior.
--
-- Arreglo: un admin también puede escribir esas columnas (ya las administra
-- desde el panel). Y se reparan los locales aprobados con dueño que se quedaron
-- sin nada, en el orden en que se aprobaron.

create or replace function public.guard_restaurant_protected_cols()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if public.is_trusted_writer() or public.is_admin((select auth.uid())) then
    return new;
  end if;
  new.paid_until          := old.paid_until;
  new.boost_until         := old.boost_until;
  new.founder_rank        := old.founder_rank;
  new.plan_period_start   := old.plan_period_start;
  new.plan_kind           := old.plan_kind;
  new.community_banned_at := old.community_banned_at;
  new.community_removals  := old.community_removals;
  new.owner_id            := old.owner_id;
  return new;
end;
$$;

-- Reparar: aprobados con dueño, sin Original ni plan.
do $$
declare
  r record;
  v_taken int;
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  perform pg_advisory_xact_lock(hashtext('elpoint_founder_rank'));
  for r in
    select id from public.restaurants
    where status = 'approved' and owner_id is not null
      and founder_rank is null and paid_until is null
    order by coalesce(reviewed_at, submitted_at), id
  loop
    select count(*) into v_taken from public.restaurants where founder_rank is not null;
    if v_taken < 100 then
      update public.restaurants
        set founder_rank = v_taken + 1,
            boost_until = greatest(coalesce(boost_until, now()), now() + interval '14 days')
        where id = r.id;
    else
      update public.restaurants
        set paid_until = submitted_at + interval '3 months',
            plan_period_start = submitted_at,
            plan_kind = 'trial',
            boost_until = greatest(coalesce(boost_until, now()), now() + interval '14 days')
        where id = r.id;
    end if;
  end loop;
  perform set_config('app.elpoint_privileged', 'off', true);
end $$;
