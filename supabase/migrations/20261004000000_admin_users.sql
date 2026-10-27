-- Panel admin: directorio de usuarios, bloqueos entre usuarios y cuentas eliminadas.
--
-- * deleted_accounts: registro MÍNIMO de moderación de cada cuenta que se
--   elimina (usuario, rol, fechas y conteos). No guarda correo ni contenido. Lo
--   escribe un trigger al borrarse el perfil, venga el borrado de la app, de la
--   página web o del propio panel.
-- * Todas las funciones son solo para administradores (is_admin).

-- ─── Registro de cuentas eliminadas ──────────────────────────────────────────
create table if not exists public.deleted_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  username text,
  role text,
  signed_up_at timestamptz,
  deleted_at timestamptz not null default now(),
  reviews_count int not null default 0,
  owned_restaurants int not null default 0,
  strikes int not null default 0,
  was_banned boolean not null default false
);

create index if not exists deleted_accounts_deleted_at_idx
  on public.deleted_accounts (deleted_at desc);

alter table public.deleted_accounts enable row level security;
revoke all on public.deleted_accounts from anon, authenticated;

create or replace function public.log_account_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.deleted_accounts
    (user_id, username, role, signed_up_at, reviews_count, owned_restaurants, strikes, was_banned)
  values (
    old.id,
    old.username,
    old.role,
    old.created_at,
    (select count(*) from public.reviews r where r.author_id = old.id),
    (select count(*) from public.restaurants x where x.owner_id = old.id),
    coalesce(old.strikes, 0),
    old.banned_at is not null
  );
  return old;
end;
$$;

drop trigger if exists trg_log_account_deletion on public.profiles;
create trigger trg_log_account_deletion
  before delete on public.profiles
  for each row execute function public.log_account_deletion();

-- ─── Directorio de usuarios ──────────────────────────────────────────────────
-- p_filter: all | banned | strikes | blocked | owners
create or replace function public.admin_user_directory(
  p_search text default null,
  p_filter text default 'all',
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  username text,
  full_name text,
  email text,
  role text,
  level int,
  xp int,
  strikes int,
  banned_at timestamptz,
  created_at timestamptz,
  reviews_count int,
  blocked_by_count int,
  restaurants_count int,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  with base as (
    select
      p.id,
      p.username,
      p.full_name,
      u.email::text as email,
      p.role,
      p.level,
      p.xp,
      p.strikes,
      p.banned_at,
      p.created_at,
      (select count(*) from public.reviews r where r.author_id = p.id)::int as reviews_count,
      (select count(*) from public.user_blocks b where b.blocked_id = p.id)::int as blocked_by_count,
      (select count(*) from public.restaurants x where x.owner_id = p.id)::int as restaurants_count
    from public.profiles p
    left join auth.users u on u.id = p.id
    where q is null
       or p.username ilike '%' || q || '%'
       or p.full_name ilike '%' || q || '%'
       or u.email ilike '%' || q || '%'
  ),
  filtered as (
    select * from base b
    where case coalesce(p_filter, 'all')
      when 'banned'  then b.banned_at is not null
      when 'strikes' then b.strikes > 0
      when 'blocked' then b.blocked_by_count > 0
      when 'owners'  then b.role = 'restaurant_owner'
      else true
    end
  )
  select
    f.id, f.username, f.full_name, f.email, f.role, f.level, f.xp, f.strikes,
    f.banned_at, f.created_at, f.reviews_count, f.blocked_by_count, f.restaurants_count,
    count(*) over () as total_count
  from filtered f
  order by f.banned_at is not null desc, f.strikes desc, f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

-- ─── Bloqueos entre usuarios ─────────────────────────────────────────────────
create or replace function public.admin_most_blocked(p_limit int default 20)
returns table (
  user_id uuid,
  username text,
  full_name text,
  blocked_by_count int,
  strikes int,
  banned_at timestamptz,
  last_blocked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    p.username,
    p.full_name,
    count(*)::int,
    p.strikes,
    p.banned_at,
    max(b.created_at)
  from public.user_blocks b
  join public.profiles p on p.id = b.blocked_id
  group by p.id
  order by count(*) desc, max(b.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
end;
$$;

create or replace function public.admin_recent_blocks(p_limit int default 30)
returns table (
  blocker_id uuid,
  blocker_username text,
  blocked_id uuid,
  blocked_username text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select
    b.blocker_id,
    pr.username,
    b.blocked_id,
    pd.username,
    b.created_at
  from public.user_blocks b
  left join public.profiles pr on pr.id = b.blocker_id
  left join public.profiles pd on pd.id = b.blocked_id
  order by b.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 200));
end;
$$;

-- ─── Cuentas eliminadas ──────────────────────────────────────────────────────
create or replace function public.admin_deleted_accounts(p_limit int default 100)
returns table (
  id uuid,
  username text,
  role text,
  signed_up_at timestamptz,
  deleted_at timestamptz,
  reviews_count int,
  owned_restaurants int,
  strikes int,
  was_banned boolean,
  total_count bigint,
  last_7_days bigint,
  last_30_days bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select
    d.id, d.username, d.role, d.signed_up_at, d.deleted_at,
    d.reviews_count, d.owned_restaurants, d.strikes, d.was_banned,
    count(*) over (),
    count(*) filter (where d.deleted_at >= now() - interval '7 days') over (),
    count(*) filter (where d.deleted_at >= now() - interval '30 days') over ()
  from public.deleted_accounts d
  order by d.deleted_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

-- ─── Banear / reactivar y limpiar strikes ────────────────────────────────────
-- p_action: ban | unban | clear_strikes
create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'No puedes cambiar tu propio estado';
  end if;

  select username into v_name from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Usuario no encontrado';
  end if;

  if p_action = 'ban' then
    update public.profiles set banned_at = now() where id = p_user_id;
  elsif p_action = 'unban' then
    update public.profiles set banned_at = null where id = p_user_id;
  elsif p_action = 'clear_strikes' then
    update public.profiles set strikes = 0 where id = p_user_id;
  else
    raise exception 'Acción no válida: %', p_action;
  end if;

  insert into public.admin_audit_log (restaurant_id, admin_id, action, detail)
  values (
    null,
    auth.uid(),
    'user_' || p_action,
    jsonb_build_object('user_id', p_user_id, 'username', v_name, 'note', p_note)
  );
end;
$$;

revoke all on function public.admin_user_directory(text, text, int, int) from public, anon;
revoke all on function public.admin_most_blocked(int) from public, anon;
revoke all on function public.admin_recent_blocks(int) from public, anon;
revoke all on function public.admin_deleted_accounts(int) from public, anon;
revoke all on function public.admin_set_user_status(uuid, text, text) from public, anon;
grant execute on function public.admin_user_directory(text, text, int, int) to authenticated;
grant execute on function public.admin_most_blocked(int) to authenticated;
grant execute on function public.admin_recent_blocks(int) to authenticated;
grant execute on function public.admin_deleted_accounts(int) to authenticated;
grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;
