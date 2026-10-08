-- Interacciones con un local (visitas y toques a contacto) para mostrarle al
-- dueño cuánta gente lo ve y le escribe. Es la medida que justifica cualquier
-- plan o Destacado de pago.
--
-- Privacidad: el dueño solo recibe CONTEOS por día y tipo, nunca quién fue.
-- La tabla no es legible ni escribible desde la API: se entra por la función
-- track_restaurant_event y se sale por get_restaurant_stats.
--   * un mismo usuario cuenta una vez por local, tipo y hora (evita inflar
--     con toques repetidos o recargas);
--   * las visitas del propio dueño no cuentan.

create table if not exists public.restaurant_events (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null
    check (event_type in ('view', 'whatsapp', 'call', 'directions', 'instagram', 'menu')),
  hour_bucket timestamptz not null default date_trunc('hour', now()),
  created_at timestamptz not null default now(),
  unique (restaurant_id, viewer_id, event_type, hour_bucket)
);

create index if not exists restaurant_events_restaurant_time_idx
  on public.restaurant_events (restaurant_id, created_at desc);

alter table public.restaurant_events enable row level security;
revoke all on public.restaurant_events from anon, authenticated;

-- ─── Registrar un evento ────────────────────────────────────────────────────
create or replace function public.track_restaurant_event(
  p_restaurant_id uuid,
  p_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;

  insert into public.restaurant_events (restaurant_id, viewer_id, event_type)
  select r.id, uid, p_type
  from public.restaurants r
  where r.id = p_restaurant_id
    and r.status = 'approved'
    and r.owner_id is distinct from uid
  on conflict do nothing;
end;
$$;

revoke execute on function public.track_restaurant_event(uuid, text) from public, anon;
grant execute on function public.track_restaurant_event(uuid, text) to authenticated;

-- ─── Leer conteos (dueño del local o admin) ─────────────────────────────────
create or replace function public.get_restaurant_stats(
  p_restaurant_id uuid,
  p_days int default 30
)
returns table (event_type text, day date, total bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.restaurants r
    where r.id = p_restaurant_id and r.owner_id = auth.uid()
  ) and not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
    select e.event_type, (e.created_at at time zone 'America/Caracas')::date as day, count(*)::bigint
    from public.restaurant_events e
    where e.restaurant_id = p_restaurant_id
      and e.created_at >= now() - make_interval(days => greatest(1, least(p_days, 400)))
    group by 1, 2
    order by 2, 1;
end;
$$;

revoke execute on function public.get_restaurant_stats(uuid, int) from public, anon;
grant execute on function public.get_restaurant_stats(uuid, int) to authenticated;
