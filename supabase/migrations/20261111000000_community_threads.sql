-- Comunidad 2 (1/4): respuestas en hilo, me gusta en respuestas y borrar la
-- propia respuesta sin romper el hilo.
--
--   * post_replies.parent_reply_id: a qué respuesta contesta (mismo post).
--   * post_reply_likes + like_count: me gusta en respuestas, +1 XP al autor y
--     aviso agrupado ("reply_like").
--   * Aviso "reply_reply" a quien escribió la respuesta que contestas.
--   * delete_my_reply: sin respuestas debajo se borra de verdad; con
--     respuestas debajo queda "Respuesta eliminada" (author_deleted_at), sin
--     contar como sanción de moderación.

alter table public.post_replies
  add column if not exists parent_reply_id uuid references public.post_replies (id) on delete set null,
  add column if not exists like_count int not null default 0,
  add column if not exists author_deleted_at timestamptz;

create index if not exists post_replies_parent on public.post_replies (parent_reply_id) where parent_reply_id is not null;

grant insert (parent_reply_id) on public.post_replies to authenticated;

-- XP por me gusta en una respuesta.
alter table public.community_xp_log drop constraint if exists community_xp_log_reason_check;
alter table public.community_xp_log
  add constraint community_xp_log_reason_check
  check (reason in ('post', 'like_received', 'reply_received', 'recommendation', 'suggestion_alta', 'reply_like_received'));

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'like', 'reply', 'levelup', 'levelup_soon', 'promo', 'review', 'weekly',
    'moderation', 'mission', 'streak', 'sub_expiring', 'sub_expired', 'plan_active',
    'post_like', 'post_reply', 'post_mention',
    'reply_like', 'reply_reply'
  ));

-- ─── El padre tiene que ser del mismo post ─────────────────────────────────
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
  ) then
    raise exception 'reply_parent_invalid';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_reply_parent on public.post_replies;
create trigger trg_check_reply_parent
  before insert on public.post_replies
  for each row execute function public.check_reply_parent();

-- ─── Aviso a quien escribió la respuesta que contestas ─────────────────────
create or replace function public.notify_reply_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_author uuid;
  v_post_author uuid;
  v_name text;
begin
  if new.parent_reply_id is null then
    return null;
  end if;
  select author_id into v_parent_author from public.post_replies where id = new.parent_reply_id;
  select author_id into v_post_author from public.posts where id = new.post_id;
  -- La autora del post ya recibe "respondió tu post": no se le manda doble.
  if v_parent_author is null or v_parent_author = new.author_id or v_parent_author = v_post_author then
    return null;
  end if;
  if exists (
    select 1 from public.user_blocks
    where (blocker_id = v_parent_author and blocked_id = new.author_id)
       or (blocker_id = new.author_id and blocked_id = v_parent_author)
  ) then
    return null;
  end if;
  if new.as_restaurant_id is not null then
    select name into v_name from public.restaurants where id = new.as_restaurant_id;
  else
    select coalesce('@' || username, full_name) into v_name from public.profiles where id = new.author_id;
  end if;
  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    v_parent_author,
    'reply_reply',
    coalesce(v_name, 'Alguien') || ' respondió tu comentario',
    public.community_snippet(new.body),
    jsonb_build_object('kind', 'post', 'post_id', new.post_id, 'reply_id', new.id)
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_reply_parent on public.post_replies;
create trigger trg_notify_reply_parent
  after insert on public.post_replies
  for each row execute function public.notify_reply_parent();

-- ─── Me gusta en respuestas ────────────────────────────────────────────────
create table if not exists public.post_reply_likes (
  reply_id uuid not null references public.post_replies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

create index if not exists post_reply_likes_user on public.post_reply_likes (user_id);

alter table public.post_reply_likes enable row level security;

drop policy if exists "reply likes readable" on public.post_reply_likes;
create policy "reply likes readable" on public.post_reply_likes for select to authenticated using (true);
drop policy if exists "user likes reply" on public.post_reply_likes;
create policy "user likes reply" on public.post_reply_likes for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "user unlikes reply" on public.post_reply_likes;
create policy "user unlikes reply" on public.post_reply_likes for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.post_reply_likes to authenticated;

create or replace function public.on_reply_like_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_as uuid;
  v_post uuid;
  v_body text;
  v_moderation text;
  v_deleted timestamptz;
  v_name text;
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.post_replies set like_count = like_count + 1
    where id = new.reply_id
    returning author_id, as_restaurant_id, post_id, body, moderation, author_deleted_at
      into v_author, v_as, v_post, v_body, v_moderation, v_deleted;
  perform set_config('app.elpoint_privileged', 'off', true);

  if v_author is null or v_author = new.user_id or v_moderation <> 'visible' or v_deleted is not null then
    return null;
  end if;

  if v_as is null then
    perform public.award_community_xp(
      v_author, 1, 'reply_like_received',
      'rlike:' || new.reply_id || ':' || new.user_id,
      v_post, new.user_id
    );
  end if;

  if not exists (
    select 1 from public.user_blocks
    where blocker_id = v_author and blocked_id = new.user_id
  ) and not exists (
    select 1 from public.notifications
    where recipient_id = v_author and type = 'reply_like' and not read
      and data ->> 'reply_id' = new.reply_id::text
  ) then
    select coalesce('@' || username, full_name) into v_name from public.profiles where id = new.user_id;
    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      v_author,
      'reply_like',
      'A ' || coalesce(v_name, 'alguien') || ' le gustó tu comentario',
      public.community_snippet(v_body),
      jsonb_build_object('kind', 'post', 'post_id', v_post, 'reply_id', new.reply_id)
    );
  end if;
  return null;
end;
$$;

create or replace function public.on_reply_like_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.post_replies set like_count = greatest(0, like_count - 1) where id = old.reply_id;
  perform set_config('app.elpoint_privileged', 'off', true);
  perform public.revert_community_xp('rlike:' || old.reply_id || ':' || old.user_id);
  return null;
end;
$$;

drop trigger if exists trg_reply_like_insert on public.post_reply_likes;
create trigger trg_reply_like_insert
  after insert on public.post_reply_likes
  for each row execute function public.on_reply_like_insert();

drop trigger if exists trg_reply_like_delete on public.post_reply_likes;
create trigger trg_reply_like_delete
  after delete on public.post_reply_likes
  for each row execute function public.on_reply_like_delete();

-- ─── Borrar la propia respuesta ────────────────────────────────────────────
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
  select id, author_id, post_id, moderation into v_row
  from public.post_replies where id = p_reply_id for update;
  if v_row.id is null or v_row.author_id is distinct from v_uid then
    raise exception 'not_authorized';
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

revoke execute on function public.delete_my_reply(uuid) from public, anon;
grant execute on function public.delete_my_reply(uuid) to authenticated;

-- El borrado directo pasa por delete_my_reply (el admin sigue moderando).
drop policy if exists "author deletes reply" on public.post_replies;
create policy "author deletes reply" on public.post_replies for delete to authenticated
  using (public.is_admin((select auth.uid())));

revoke execute on function public.check_reply_parent() from public, anon, authenticated;
revoke execute on function public.notify_reply_parent() from public, anon, authenticated;
revoke execute on function public.on_reply_like_insert() from public, anon, authenticated;
revoke execute on function public.on_reply_like_delete() from public, anon, authenticated;
