-- Comunidad 2: arreglos de la revisión final.
--
--   1. delete_my_reply no borra una respuesta en revisión (como antes).
--   2. Responder como local no menciona con la cuenta personal del dueño.
--   3. Buscar @usuarios con "_" funciona (se escapa, no se borra) y hay una
--      búsqueda exacta para abrir el perfil de una mención.
--   4. Menciones sin spam: un solo aviso sin leer por autor y persona mencionada.
--   5. reply_count no cuenta respuestas borradas por su autor.
--   7. Encuestas: no se vota en posts ocultos ni con bloqueo; quien la creó
--      puede votar pero no gana XP.
--   9. No se responde a una respuesta borrada u oculta.

-- 1 ─────────────────────────────────────────────────────────────────────────
create or replace function public.delete_my_reply(p_reply_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row record;
begin
  select id, author_id, post_id, moderation, author_deleted_at into v_row
  from public.post_replies where id = p_reply_id for update;
  if v_row.id is null or v_row.author_id is distinct from v_uid then
    raise exception 'not_authorized';
  end if;
  if v_row.moderation <> 'visible' then
    raise exception 'reply_under_review';
  end if;
  if v_row.author_deleted_at is not null then
    return;
  end if;

  if exists (select 1 from public.post_replies where parent_reply_id = p_reply_id) then
    perform set_config('app.elpoint_privileged', 'on', true);
    update public.post_replies
      set author_deleted_at = now(), body = '[eliminada]', restaurant_id = null
      where id = p_reply_id;
    perform set_config('app.elpoint_privileged', 'off', true);
    perform public.revert_community_xp('rec:' || p_reply_id);
    delete from public.post_reply_likes where reply_id = p_reply_id;
  else
    delete from public.post_replies where id = p_reply_id;
  end if;
end;
$$;

-- 2 + 4 ─────────────────────────────────────────────────────────────────────
create or replace function public.record_mentions(
  p_post_id uuid,
  p_reply_id uuid,
  p_author uuid,
  p_body text,
  p_skip uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user record;
  v_name text;
begin
  select coalesce('@' || username, full_name) into v_name from public.profiles where id = p_author;
  for v_user in
    select p.id
    from unnest(public.extract_mentions(p_body)) as m(u)
    join public.profiles p on lower(p.username) = m.u
    where p.id <> p_author
      and not (p.id = any (coalesce(p_skip, '{}')))
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = p.id and b.blocked_id = p_author)
           or (b.blocker_id = p_author and b.blocked_id = p.id))
  loop
    insert into public.post_mentions (post_id, reply_id, user_id)
    values (p_post_id, p_reply_id, v_user.id)
    on conflict do nothing;
    -- Un solo aviso sin leer de la misma persona: no se puede usar para spamear.
    if not exists (
      select 1 from public.notifications
      where recipient_id = v_user.id and type = 'user_mention' and not read
        and data ->> 'author_id' = p_author::text
    ) then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        v_user.id,
        'user_mention',
        coalesce(v_name, 'Alguien') || ' te mencionó',
        public.community_snippet(p_body),
        jsonb_build_object('kind', 'post', 'post_id', p_post_id, 'reply_id', p_reply_id, 'author_id', p_author)
      );
    end if;
  end loop;
end;
$$;

create or replace function public.on_reply_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_skip uuid[];
begin
  -- Respondiendo como local no se menciona (sería con la cuenta del dueño).
  if new.as_restaurant_id is not null then
    return null;
  end if;
  select array_remove(array[
    (select author_id from public.posts where id = new.post_id),
    (select author_id from public.post_replies where id = new.parent_reply_id)
  ], null) into v_skip;
  perform public.record_mentions(new.post_id, new.id, new.author_id, new.body, v_skip);
  return null;
end;
$$;

-- 3 ─────────────────────────────────────────────────────────────────────────
create or replace function public.search_mention_users(p_query text, p_post_id uuid default null)
returns table (id uuid, username text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as uid),
  q as (
    select replace(replace(replace(lower(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') as pat
  ),
  participants as (
    select distinct x.author_id as uid
    from (
      select author_id from public.posts where id = p_post_id and as_restaurant_id is null
      union all
      select author_id from public.post_replies where post_id = p_post_id and as_restaurant_id is null
    ) x
  )
  select p.id, p.username, p.avatar_url
  from public.profiles p, me, q
  where p.username is not null
    and p.banned_at is null
    and p.id <> me.uid
    and lower(p.username) like q.pat || '%' escape '\'
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = p.id and b.blocked_id = me.uid)
         or (b.blocker_id = me.uid and b.blocked_id = p.id))
  order by (p.id in (select uid from participants)) desc, p.username
  limit 8;
$$;

create or replace function public.user_id_by_username(p_username text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p
  where lower(p.username) = lower(p_username) and p.banned_at is null
  limit 1;
$$;

revoke execute on function public.user_id_by_username(text) from public, anon;
grant execute on function public.user_id_by_username(text) to authenticated;

-- 5 ─────────────────────────────────────────────────────────────────────────
create or replace function public.sync_post_reply_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post uuid := coalesce(new.post_id, old.post_id);
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.posts p
    set reply_count = (
      select count(*) from public.post_replies r
      where r.post_id = v_post and r.moderation = 'visible' and r.author_deleted_at is null)
    where p.id = v_post;
  perform set_config('app.elpoint_privileged', 'off', true);
  return null;
end;
$$;

drop trigger if exists trg_zz_sync_post_reply_count on public.post_replies;
create trigger trg_zz_sync_post_reply_count
  after insert or delete or update of moderation, author_deleted_at on public.post_replies
  for each row execute function public.sync_post_reply_count();

select set_config('app.elpoint_privileged', 'on', true);
update public.posts p
  set reply_count = (
    select count(*) from public.post_replies r
    where r.post_id = p.id and r.moderation = 'visible' and r.author_deleted_at is null)
  where reply_count is distinct from (
    select count(*) from public.post_replies r
    where r.post_id = p.id and r.moderation = 'visible' and r.author_deleted_at is null);
select set_config('app.elpoint_privileged', 'off', true);

-- 7 ─────────────────────────────────────────────────────────────────────────
create or replace function public.vote_poll(p_post_id uuid, p_option_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_closes timestamptz;
  v_author uuid;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and banned_at is not null) then
    raise exception 'user_banned';
  end if;
  select pp.closes_at, p.author_id into v_closes, v_author
  from public.post_polls pp
  join public.posts p on p.id = pp.post_id and p.moderation = 'visible'
  where pp.post_id = p_post_id;
  if v_closes is null then
    raise exception 'poll_not_found';
  end if;
  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_author and b.blocked_id = v_uid)
       or (b.blocker_id = v_uid and b.blocked_id = v_author)
  ) then
    raise exception 'poll_not_found';
  end if;
  if v_closes <= now() then
    raise exception 'poll_closed';
  end if;
  if not exists (select 1 from public.post_poll_options where id = p_option_id and post_id = p_post_id) then
    raise exception 'poll_invalid_option';
  end if;

  insert into public.post_poll_votes (post_id, user_id, option_id)
  values (p_post_id, v_uid, p_option_id)
  on conflict (post_id, user_id) do update set option_id = excluded.option_id;

  if v_uid <> v_author then
    perform public.award_community_xp(v_uid, 2, 'poll_vote', 'vote:' || p_post_id || ':' || v_uid, p_post_id, null);
  end if;

  return public.poll_state_for(p_post_id, v_uid, false);
end;
$$;

-- 9 ─────────────────────────────────────────────────────────────────────────
create or replace function public.check_reply_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_reply_id is not null and not exists (
    select 1 from public.post_replies
    where id = new.parent_reply_id and post_id = new.post_id
      and moderation = 'visible' and author_deleted_at is null
  ) then
    raise exception 'reply_parent_invalid';
  end if;
  return new;
end;
$$;
