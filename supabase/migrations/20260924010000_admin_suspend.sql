-- Suspender y reactivar un local desde el panel de admin.
--
-- Antes un local solo se suspendía solo, por reportes de comensales. Ahora el
-- admin también puede hacerlo a mano, con un motivo que el dueño recibe como
-- aviso, y reactivarlo. Cada acción queda en admin_audit_log.
--
-- Un local suspendido deja de verse en la app (la política de lectura solo
-- muestra los aprobados) y aparece en la cola "Suspendidos" del panel.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants (id) on delete cascade,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_restaurant_idx
  on public.admin_audit_log (restaurant_id, created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

drop policy if exists "admin reads audit log" on public.admin_audit_log;
create policy "admin reads audit log"
  on public.admin_audit_log for select to authenticated
  using (public.is_admin((select auth.uid())));

create or replace function public.admin_set_restaurant_status(
  p_restaurant_id uuid,
  p_action text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_owner uuid;
  v_status text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select name, owner_id, status into v_name, v_owner, v_status
  from public.restaurants where id = p_restaurant_id for update;

  if v_name is null then
    raise exception 'Local no encontrado';
  end if;

  if p_action = 'suspend' then
    if v_status <> 'approved' then
      raise exception 'Solo se puede suspender un local aprobado';
    end if;
    update public.restaurants
      set status = 'suspended',
          status_reason = coalesce(v_reason, 'Suspendido por el equipo de El Point'),
          reviewed_at = now()
      where id = p_restaurant_id;

    if v_owner is not null then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        v_owner, 'moderation',
        'Tu local fue suspendido · ' || v_name,
        coalesce(v_reason, 'Revisamos tu local y lo suspendimos.') || ' Escríbenos desde Soporte si crees que es un error.',
        jsonb_build_object('restaurant_id', p_restaurant_id, 'kind', 'suspended')
      );
    end if;

  elsif p_action = 'reactivate' then
    if v_status <> 'suspended' then
      raise exception 'Solo se puede reactivar un local suspendido';
    end if;
    update public.restaurants
      set status = 'approved', status_reason = null, reviewed_at = now()
      where id = p_restaurant_id;

    if v_owner is not null then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        v_owner, 'moderation',
        'Tu local volvió a estar visible · ' || v_name,
        'Revisamos tu local y lo reactivamos. Ya aparece de nuevo en El Point.',
        jsonb_build_object('restaurant_id', p_restaurant_id, 'kind', 'reactivated')
      );
    end if;

  else
    raise exception 'Acción no válida';
  end if;

  insert into public.admin_audit_log (restaurant_id, admin_id, action, detail)
  values (p_restaurant_id, auth.uid(), p_action, jsonb_build_object('reason', v_reason));
end;
$$;

revoke execute on function public.admin_set_restaurant_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_restaurant_status(uuid, text, text) to authenticated;
