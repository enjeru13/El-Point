-- ═══════════════════════════════════════════════════════════════════════════
-- Comunidad (2/6): XP por interactuar, con tope de 20 al día y descuento.
--
-- Cada XP de Comunidad queda en community_xp_log con una clave de origen
-- única (source_key). Así:
--   * nunca se paga dos veces lo mismo (índice único sobre las filas activas),
--   * se puede descontar exactamente lo que se pagó (reverted = true),
--   * el tope del día es la suma de las filas activas de ese día.
-- Claves usadas: post:{post}, like:{post}:{user}, reply:{post}:{user},
-- rec:{reply}, alta:{nombre normalizado}.
-- El día es el calendario de Caracas.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.community_xp_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null check (amount >= 0),
  reason text not null
    check (reason in ('post', 'like_received', 'reply_received', 'recommendation', 'suggestion_alta')),
  post_id uuid,
  actor_id uuid,
  source_key text not null,
  day date not null,
  reverted boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists community_xp_log_active_key
  on public.community_xp_log (source_key) where not reverted;
create index if not exists community_xp_log_user_day
  on public.community_xp_log (user_id, day) where not reverted;
create index if not exists community_xp_log_post
  on public.community_xp_log (post_id, user_id) where not reverted;

alter table public.community_xp_log enable row level security;
revoke all on public.community_xp_log from anon, authenticated;

create or replace function public.community_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Caracas')::date;
$$;

-- Paga hasta p_amount respetando el tope de 20 por día. Devuelve lo pagado.
-- Si la clave ya está usada (fila activa), no paga nada.
create or replace function public.award_community_xp(
  p_user uuid,
  p_amount int,
  p_reason text,
  p_source_key text,
  p_post uuid,
  p_actor uuid
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := public.community_today();
  v_today int;
  v_grant int;
begin
  if p_user is null or p_amount <= 0 then
    return 0;
  end if;

  if exists (
    select 1 from public.community_xp_log
    where source_key = p_source_key and not reverted
  ) then
    return 0;
  end if;

  -- Serializa los pagos de una misma persona para que el tope no se pase
  -- con dos inserciones simultáneas.
  perform pg_advisory_xact_lock(hashtextextended('community_xp:' || p_user::text, 0));

  select coalesce(sum(amount), 0) into v_today
  from public.community_xp_log
  where user_id = p_user and day = v_day and not reverted;

  v_grant := greatest(0, least(p_amount, 20 - v_today));

  insert into public.community_xp_log (user_id, amount, reason, post_id, actor_id, source_key, day)
  values (p_user, v_grant, p_reason, p_post, p_actor, p_source_key, v_day)
  on conflict do nothing;

  if not found then
    return 0;
  end if;

  if v_grant > 0 then
    perform public.award_xp(p_user, v_grant);
  end if;
  return v_grant;
end;
$$;

-- Descuenta lo que pagó una clave (si sigue activa).
create or replace function public.revert_community_xp(p_source_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_amount int;
begin
  update public.community_xp_log
    set reverted = true
    where source_key = p_source_key and not reverted
    returning user_id, amount into v_user, v_amount;

  if v_amount > 0 then
    perform public.award_xp(v_user, -v_amount);
  end if;
end;
$$;

-- Descuenta todo lo que un post le dio a una persona (post, me gusta y
-- respuestas recibidas).
create or replace function public.revert_community_xp_for_post(p_post uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select source_key from public.community_xp_log
    where post_id = p_post and user_id = p_user and not reverted
  loop
    perform public.revert_community_xp(r.source_key);
  end loop;
end;
$$;

revoke execute on function public.award_community_xp(uuid, int, text, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.revert_community_xp(text) from public, anon, authenticated;
revoke execute on function public.revert_community_xp_for_post(uuid, uuid) from public, anon, authenticated;

-- ─── Me gusta: contador y +1 al autor ──────────────────────────────────────
create or replace function public.on_post_like_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_as_restaurant uuid;
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.posts set like_count = like_count + 1
    where id = new.post_id
    returning author_id, as_restaurant_id into v_author, v_as_restaurant;
  perform set_config('app.elpoint_privileged', 'off', true);

  if v_author is not null and v_author <> new.user_id and v_as_restaurant is null then
    perform public.award_community_xp(
      v_author, 1, 'like_received',
      'like:' || new.post_id || ':' || new.user_id,
      new.post_id, new.user_id
    );
  end if;
  return null;
end;
$$;

drop trigger if exists trg_post_like_insert on public.post_likes;
create trigger trg_post_like_insert
  after insert on public.post_likes
  for each row execute function public.on_post_like_insert();

create or replace function public.on_post_like_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  perform set_config('app.elpoint_privileged', 'off', true);
  perform public.revert_community_xp('like:' || old.post_id || ':' || old.user_id);
  return null;
end;
$$;

drop trigger if exists trg_post_like_delete on public.post_likes;
create trigger trg_post_like_delete
  after delete on public.post_likes
  for each row execute function public.on_post_like_delete();

-- ─── Borrar un post descuenta todo lo que le dio a su autor ────────────────
create or replace function public.on_post_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.revert_community_xp_for_post(old.id, old.author_id);
  return null;
end;
$$;

drop trigger if exists trg_post_delete on public.posts;
create trigger trg_post_delete
  after delete on public.posts
  for each row execute function public.on_post_delete();
