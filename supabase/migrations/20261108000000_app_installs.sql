-- Instalaciones y uso de la app, para el panel admin y el contador de la landing.
--
-- Cada instalación genera un id al azar la primera vez que se abre (guardado en
-- el teléfono) y avisa con app_heartbeat() al abrir la app. No hace falta
-- tener cuenta: así se cuentan también quienes solo miran locales.
--
--   * app_installs: una fila por instalación (plataforma, versión, primera y
--     última vez que se abrió, y la cuenta si inició sesión).
--   * app_install_days: un registro por instalación y día (hora de Caracas),
--     para contar usuarios activos día a día.
--
-- Nadie lee ni escribe estas tablas directo: solo las funciones de abajo.
-- Riesgo aceptado: como el aviso es anónimo, alguien podría inflar los números
-- llamando a la función con ids inventados. Solo afecta las estadísticas.

create table public.app_installs (
  install_id   uuid primary key,
  platform     text not null check (platform in ('ios', 'android')),
  app_version  text not null check (char_length(app_version) between 1 and 20),
  user_id      uuid references auth.users (id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index app_installs_first_seen_idx on public.app_installs (first_seen_at);
create index app_installs_user_idx on public.app_installs (user_id) where user_id is not null;

create table public.app_install_days (
  install_id uuid not null references public.app_installs (install_id) on delete cascade,
  day        date not null,
  primary key (install_id, day)
);

create index app_install_days_day_idx on public.app_install_days (day);

alter table public.app_installs enable row level security;
alter table public.app_install_days enable row level security;
revoke all on public.app_installs from anon, authenticated;
revoke all on public.app_install_days from anon, authenticated;

-- ─── Aviso de la app al abrirse ──────────────────────────────────────────
create or replace function public.app_heartbeat(
  p_install_id uuid,
  p_platform   text,
  p_version    text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'America/Caracas')::date;
begin
  if p_install_id is null
     or p_platform is null or p_platform not in ('ios', 'android')
     or p_version is null or char_length(p_version) not between 1 and 20 then
    raise exception 'invalid heartbeat';
  end if;

  insert into public.app_installs as i (install_id, platform, app_version, user_id)
  values (p_install_id, p_platform, p_version, auth.uid())
  on conflict (install_id) do update
    set platform     = excluded.platform,
        app_version  = excluded.app_version,
        last_seen_at = now(),
        user_id      = coalesce(auth.uid(), i.user_id);

  insert into public.app_install_days (install_id, day)
  values (p_install_id, v_day)
  on conflict do nothing;
end;
$$;

revoke all on function public.app_heartbeat(uuid, text, text) from public;
grant execute on function public.app_heartbeat(uuid, text, text) to anon, authenticated;

-- ─── Panel admin ─────────────────────────────────────────────────────────
-- Un solo JSON con los totales y la serie diaria de los últimos p_days días.
create or replace function public.admin_app_usage(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Caracas')::date;
  v_days  int  := least(greatest(coalesce(p_days, 30), 1), 365);
  v_result jsonb;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'installs', (
      select jsonb_build_object(
        'ios',     count(*) filter (where platform = 'ios'),
        'android', count(*) filter (where platform = 'android'),
        'with_account', count(*) filter (where user_id is not null)
      )
      from public.app_installs
    ),
    'active_7', (
      select jsonb_build_object(
        'ios',     count(distinct d.install_id) filter (where i.platform = 'ios'),
        'android', count(distinct d.install_id) filter (where i.platform = 'android')
      )
      from public.app_install_days d
      join public.app_installs i using (install_id)
      where d.day > v_today - 7
    ),
    'active_30', (
      select jsonb_build_object(
        'ios',     count(distinct d.install_id) filter (where i.platform = 'ios'),
        'android', count(distinct d.install_id) filter (where i.platform = 'android')
      )
      from public.app_install_days d
      join public.app_installs i using (install_id)
      where d.day > v_today - 30
    ),
    'push_enabled', (
      select count(*) from public.profiles
      where push_token is not null and push_token <> ''
    ),
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object('platform', platform, 'version', app_version, 'installs', n)
                       order by platform, n desc)
      from (
        select platform, app_version, count(*) as n
        from public.app_installs
        where last_seen_at > now() - interval '30 days'
        group by platform, app_version
      ) v
    ), '[]'::jsonb),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'day', g.day,
        'new_ios', (select count(*) from public.app_installs i
                     where i.platform = 'ios'
                       and (i.first_seen_at at time zone 'America/Caracas')::date = g.day),
        'new_android', (select count(*) from public.app_installs i
                         where i.platform = 'android'
                           and (i.first_seen_at at time zone 'America/Caracas')::date = g.day),
        'active_ios', (select count(*) from public.app_install_days d
                        join public.app_installs i using (install_id)
                        where d.day = g.day and i.platform = 'ios'),
        'active_android', (select count(*) from public.app_install_days d
                            join public.app_installs i using (install_id)
                            where d.day = g.day and i.platform = 'android')
      ) order by g.day)
      from (
        select generate_series(v_today - (v_days - 1), v_today, interval '1 day')::date as day
      ) g
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_app_usage(int) from public;
grant execute on function public.admin_app_usage(int) to authenticated;

-- ─── Contador público de la landing ──────────────────────────────────────
-- Devuelve el total de instalaciones solo cuando ya luce bien (500 o más).
-- Antes devuelve null y la landing no muestra el contador.
create or replace function public.public_install_count()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case when n >= 500 then n end
  from (select count(*)::int as n from public.app_installs) c;
$$;

revoke all on function public.public_install_count() from public;
grant execute on function public.public_install_count() to anon, authenticated;
