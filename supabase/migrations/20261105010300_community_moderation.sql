-- ═══════════════════════════════════════════════════════════════════════════
-- Comunidad (4/6): moderación (mismo modelo que las reseñas).
--
--   * Columnas protegidas: solo los triggers (app.elpoint_privileged) y el
--     admin (moderation/moderated_at) las cambian.
--   * 3 reportes distintos ocultan el post o la respuesta. El reporte del
--     dueño del local etiquetado cuenta como uno más (a diferencia de reseñas).
--   * Retirar ("removed"): strike al autor y descuento de su XP; si era de
--     local, cuenta para el local y a las 3 pierde el permiso de publicar,
--     sin strike personal.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.guard_post_cols()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.elpoint_privileged', true), 'off') = 'on' then
    return new;
  end if;

  if not public.is_admin((select auth.uid())) then
    new.moderation := old.moderation;
    new.moderated_at := old.moderated_at;
  elsif new.moderation is distinct from old.moderation then
    new.moderated_at := now();
  end if;

  new.author_id := old.author_id;
  new.as_restaurant_id := old.as_restaurant_id;
  if tg_table_name = 'posts' then
    new.like_count := old.like_count;
    new.reply_count := old.reply_count;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_post_cols on public.posts;
create trigger trg_guard_post_cols
  before update on public.posts
  for each row execute function public.guard_post_cols();

drop trigger if exists trg_guard_post_reply_cols on public.post_replies;
create trigger trg_guard_post_reply_cols
  before update on public.post_replies
  for each row execute function public.guard_post_cols();

-- ─── Ocultar con 3 reportes distintos ──────────────────────────────────────
create or replace function public.evaluate_post_moderation(p_post uuid, p_reply uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_distinct int;
  v_author uuid;
  v_post uuid;
begin
  if p_post is not null then
    select count(distinct reporter_id) into v_distinct
    from public.post_reports where post_id = p_post;
  else
    select count(distinct reporter_id) into v_distinct
    from public.post_reports where reply_id = p_reply;
  end if;

  if v_distinct < 3 then
    return;
  end if;

  perform set_config('app.elpoint_privileged', 'on', true);
  if p_post is not null then
    update public.posts set moderation = 'hidden', moderated_at = now()
      where id = p_post and moderation = 'visible'
      returning author_id, id into v_author, v_post;
  else
    update public.post_replies set moderation = 'hidden', moderated_at = now()
      where id = p_reply and moderation = 'visible'
      returning author_id, post_id into v_author, v_post;
  end if;
  perform set_config('app.elpoint_privileged', 'off', true);

  if v_author is not null then
    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      v_author,
      'moderation',
      case when p_post is not null then 'Tu post está en revisión' else 'Tu respuesta está en revisión' end,
      'Recibimos reportes sobre lo que publicaste en Comunidad. Un moderador lo revisará pronto.',
      jsonb_build_object('kind', 'post', 'post_id', v_post)
    );
  end if;
end;
$$;

revoke execute on function public.evaluate_post_moderation(uuid, uuid) from public, anon, authenticated;

create or replace function public.on_post_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  perform public.evaluate_post_moderation(new.post_id, new.reply_id);

  -- Aviso a los admins solo en el primer reporte de cada cosa.
  select count(*) into v_count from public.post_reports
  where post_id is not distinct from new.post_id and reply_id is not distinct from new.reply_id;
  if v_count = 1 then
    insert into public.notifications (recipient_id, type, title, body, data)
    select p.id,
           'moderation',
           'Nuevo reporte en Comunidad',
           case when new.post_id is not null then 'Reportaron un post.' else 'Reportaron una respuesta.' end
             || ' Revísalo en el panel.',
           jsonb_build_object('kind', 'post_report', 'post_id', new.post_id, 'reply_id', new.reply_id)
    from public.profiles p
    where p.is_admin;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_on_post_report on public.post_reports;
create trigger trg_on_post_report
  after insert on public.post_reports
  for each row execute function public.on_post_report();

-- ─── Retirar: strike (o permiso del local) y descuento de XP ───────────────
create or replace function public.community_strike(p_author uuid, p_as_restaurant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  if p_as_restaurant is not null then
    update public.restaurants
      set community_removals = community_removals + 1
      where id = p_as_restaurant
      returning community_removals into v_count;
    if v_count >= 3 then
      update public.restaurants set community_banned_at = now()
        where id = p_as_restaurant and community_banned_at is null;
    end if;
  else
    update public.profiles set strikes = strikes + 1
      where id = p_author
      returning strikes into v_count;
    if v_count >= 3 then
      update public.profiles set banned_at = now()
        where id = p_author and banned_at is null;
    end if;
  end if;
  perform set_config('app.elpoint_privileged', 'off', true);
end;
$$;

revoke execute on function public.community_strike(uuid, uuid) from public, anon, authenticated;

create or replace function public.on_post_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.moderation = 'removed' and old.moderation <> 'removed' then
    perform public.community_strike(new.author_id, new.as_restaurant_id);
    perform public.revert_community_xp_for_post(new.id, new.author_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_on_post_removed on public.posts;
create trigger trg_on_post_removed
  after update of moderation on public.posts
  for each row execute function public.on_post_removed();

create or replace function public.on_post_reply_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.moderation = 'removed' and old.moderation <> 'removed' then
    perform public.community_strike(new.author_id, new.as_restaurant_id);
    perform public.revert_community_xp('rec:' || new.id);
    if not exists (
      select 1 from public.post_replies
      where post_id = new.post_id and author_id = new.author_id
        and as_restaurant_id is null and moderation <> 'removed'
    ) then
      perform public.revert_community_xp('reply:' || new.post_id || ':' || new.author_id);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_on_post_reply_removed on public.post_replies;
create trigger trg_on_post_reply_removed
  after update of moderation on public.post_replies
  for each row execute function public.on_post_reply_removed();
