-- Comunidad 2 (4/4): ajustes de avisos, avisos nuevos y publicación pública.
--
--   * Ajuste "Comunidad" (notifCommunity) para todos los avisos de Comunidad y
--     "Logros y rachas" (notifAchievements) para misiones y rachas.
--   * Las promos ya no se mandan como push a quien nunca tocó el ajuste: en la
--     app vienen apagadas por defecto (push_setting_default).
--   * Avisos nuevos: tu reseña fue retirada; aprobamos el local que sugeriste.
--   * get_public_post: la publicación completa para la página web /p.

create or replace function public.push_setting_key(p_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'like'         then 'notifRanks'
    when 'reply'        then 'notifReplies'
    when 'review'       then 'notifReviews'
    when 'levelup'      then 'notifLevelup'
    when 'mission'      then 'notifAchievements'
    when 'streak'       then 'notifAchievements'
    when 'promo'        then 'notifPromos'
    when 'weekly'       then 'notifWeekly'
    when 'post_like'    then 'notifCommunity'
    when 'post_reply'   then 'notifCommunity'
    when 'reply_like'   then 'notifCommunity'
    when 'reply_reply'  then 'notifCommunity'
    when 'user_mention' then 'notifCommunity'
    when 'poll_ended'   then 'notifCommunity'
    when 'post_mention' then 'notifReviews'
    else null            -- moderación y avisos de plan: siempre push
  end;
$$;

create or replace function public.push_setting_default(p_key text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_key when 'notifPromos' then 'false' else 'true' end;
$$;

create or replace function public.send_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_settings jsonb;
  v_key text;
begin
  select push_token, settings
    into v_token, v_settings
  from public.profiles
  where id = new.recipient_id;

  if v_token is null or v_token = '' then
    return null;
  end if;

  v_key := public.push_setting_key(new.type);
  if v_key is not null
     and coalesce(v_settings ->> v_key, public.push_setting_default(v_key)) = 'false' then
    return null;
  end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Accept', 'application/json'
    ),
    body := jsonb_build_object(
      'to', v_token,
      'title', new.title,
      'body', coalesce(new.body, ''),
      'sound', 'default',
      'data', coalesce(new.data, '{}'::jsonb) || jsonb_build_object('notification_id', new.id, 'type', new.type)
    )
  );
  return null;
end;
$$;

-- Quien había apagado "Respuestas" sigue con Comunidad apagado.
update public.profiles
  set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('notifCommunity', false)
  where settings ->> 'notifReplies' = 'false'
    and settings ->> 'notifCommunity' is null;

-- ─── Tu reseña fue retirada ────────────────────────────────────────────────
create or replace function public.notify_review_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.moderation = 'removed' and old.moderation is distinct from 'removed' then
    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      new.author_id,
      'moderation',
      'Retiramos tu reseña',
      'Revisamos los reportes y no cumple las normas de El Point.',
      jsonb_build_object('kind', 'review_removed', 'restaurant_id', new.restaurant_id)
    );
  end if;
  return null;
end;
$$;

drop trigger if exists trg_notify_review_removed on public.reviews;
create trigger trg_notify_review_removed
  after update of moderation on public.reviews
  for each row execute function public.notify_review_removed();

-- ─── Aprobamos el local que sugeriste ──────────────────────────────────────
-- Se engancha al XP de "alta" (se paga una sola vez por nombre).
create or replace function public.notify_suggestion_alta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant uuid;
  v_name text;
begin
  if new.reason <> 'suggestion_alta' then
    return null;
  end if;
  select ls.restaurant_id, r.name into v_restaurant, v_name
  from public.local_suggestions ls
  left join public.restaurants r on r.id = ls.restaurant_id
  where 'alta:' || ls.normalized_name = new.source_key;
  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    new.user_id,
    'mission',
    'Aprobamos el local que sugeriste',
    coalesce(v_name || ' ya está en El Point. ', '') || '+' || new.amount || ' XP por traerlo.',
    jsonb_build_object('kind', 'suggestion_approved', 'restaurant_id', v_restaurant)
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_suggestion_alta on public.community_xp_log;
create trigger trg_notify_suggestion_alta
  after insert on public.community_xp_log
  for each row execute function public.notify_suggestion_alta();

-- ─── Publicación pública (página web /p) ───────────────────────────────────
create or replace function public.get_public_post(p_post_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'topic', p.topic,
    'body', p.body,
    'created_at', p.created_at,
    'like_count', p.like_count,
    'reply_count', p.reply_count,
    'author', case when p.as_restaurant_id is not null
      then jsonb_build_object('username', null, 'name', ar.name, 'avatar_url', ar.logo_url, 'level', null)
      else jsonb_build_object('username', a.username, 'name', a.full_name, 'avatar_url', a.avatar_url, 'level', a.level) end,
    'restaurant', case when r.id is null then null else jsonb_build_object('id', r.id, 'name', r.name) end,
    'suggested_name', p.suggested_name,
    'photos', (
      select coalesce(jsonb_agg(ph.storage_path order by ph.position), '[]'::jsonb)
      from public.post_photos ph where ph.post_id = p.id),
    'poll', public.poll_state_for(p.id, null, true),
    'replies', (
      select coalesce(jsonb_agg(x.j order by x.created_at), '[]'::jsonb)
      from (
        select rp.created_at,
               jsonb_build_object(
                 'author', jsonb_build_object(
                   'username', case when rp.as_restaurant_id is null then ra.username end,
                   'name', coalesce(rr.name, ra.full_name),
                   'avatar_url', coalesce(rr.logo_url, ra.avatar_url)),
                 'body', rp.body,
                 'created_at', rp.created_at) as j
        from public.post_replies rp
        join public.profiles ra on ra.id = rp.author_id
        left join public.restaurants rr on rr.id = rp.as_restaurant_id
        where rp.post_id = p.id and rp.moderation = 'visible' and rp.author_deleted_at is null
          and rp.parent_reply_id is null and ra.banned_at is null
        order by rp.created_at
        limit 2) x)
  )
  from public.posts p
  join public.profiles a on a.id = p.author_id
  left join public.restaurants ar on ar.id = p.as_restaurant_id
  left join public.restaurants r on r.id = p.restaurant_id and r.status = 'approved' and r.is_active
  where p.id = p_post_id
    and p.moderation = 'visible'
    and a.banned_at is null;
$$;

revoke execute on function public.notify_review_removed() from public, anon, authenticated;
revoke execute on function public.notify_suggestion_alta() from public, anon, authenticated;
revoke execute on function public.get_public_post(uuid) from public;
grant execute on function public.get_public_post(uuid) to anon, authenticated;
