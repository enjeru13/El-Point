-- ═══════════════════════════════════════════════════════════════════════════
-- Comunidad (3/6): publicar y responder.
--
-- create_post() es la única forma de crear un post. Valida todo en una
-- transacción y lanza códigos de error fijos que la app traduce
-- (lib/community/topics.ts → errorMessage):
--   not_authenticated, user_banned, post_rate_limited, post_needs_tag,
--   too_many_categories, invalid_topic, restaurant_not_found,
--   owner_not_allowed, owner_posts_disabled, owner_no_plan, owner_banned,
--   owner_post_rate_limited
-- Respuestas: reply_rate_limited, post_not_available,
--   owner_reply_not_mentioned (y los de dueño de arriba).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Avisos nuevos ─────────────────────────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'like', 'reply', 'levelup', 'levelup_soon', 'promo', 'review', 'weekly',
    'moderation', 'mission', 'streak', 'sub_expiring', 'sub_expired', 'plan_active',
    'post_like', 'post_reply', 'post_mention'
  ));

create or replace function public.push_setting_key(p_type text)
returns text
language sql
immutable
as $$
  select case p_type
    when 'like'         then 'notifRanks'
    when 'reply'        then 'notifReplies'
    when 'review'       then 'notifReviews'
    when 'levelup'      then 'notifLevelup'
    when 'mission'      then 'notifLevelup'
    when 'streak'       then 'notifLevelup'
    when 'promo'        then 'notifPromos'
    when 'weekly'       then 'notifWeekly'
    when 'post_like'    then 'notifRanks'
    when 'post_reply'   then 'notifReplies'
    when 'post_mention' then 'notifReviews'
    else null            -- 'moderation', avisos de plan y cualquier otro: siempre push
  end;
$$;

-- ─── Misiones nuevas ───────────────────────────────────────────────────────
create or replace function public.mission_xp(p_mission text)
returns int
language sql
immutable
as $$
  select case p_mission
    when 'first_review'  then 20
    when 'photo_review'  then 25
    when 'five_places'   then 60
    when 'ten_helpful'   then 60
    when 'streak_4'      then 100
    when 'explorer_15'   then 150
    when 'first_post'    then 20
    when 'brought_local' then 50
    else 0
  end;
$$;

create or replace function public.mission_title(p_mission text)
returns text
language sql
immutable
as $$
  select case p_mission
    when 'first_review'  then 'Primera reseña'
    when 'photo_review'  then 'Reseña con foto'
    when 'five_places'   then '5 locales distintos'
    when 'ten_helpful'   then '10 "me sirve" recibidos'
    when 'streak_4'      then 'Un mes en racha'
    when 'explorer_15'   then 'Explorador: 15 locales'
    when 'first_post'    then 'Tu primer post en Comunidad'
    when 'brought_local' then 'Trajiste un local a El Point'
    else p_mission
  end;
$$;

-- ─── ¿Puede este usuario actuar como este local en Comunidad? ──────────────
create or replace function public.assert_can_act_as_restaurant(p_user uuid, p_restaurant uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_banned timestamptz;
begin
  select owner_id, community_banned_at into v_owner, v_banned
  from public.restaurants where id = p_restaurant;

  if v_owner is null or v_owner <> p_user then
    raise exception 'owner_not_allowed';
  end if;
  if not coalesce((select owner_posts_enabled from public.app_settings where id), false) then
    raise exception 'owner_posts_disabled';
  end if;
  if not public.restaurant_has_plan(p_restaurant) then
    raise exception 'owner_no_plan';
  end if;
  if v_banned is not null then
    raise exception 'owner_banned';
  end if;
end;
$$;

revoke execute on function public.assert_can_act_as_restaurant(uuid, uuid) from public, anon, authenticated;

-- Local de la app que se puede etiquetar: aprobado y activo.
create or replace function public.community_taggable_restaurant(p_restaurant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.restaurants
    where id = p_restaurant and status = 'approved' and is_active
  );
$$;

-- Texto corto para el cuerpo de un aviso.
create or replace function public.community_snippet(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when char_length(p_text) > 80 then left(p_text, 79) || '…' else p_text end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- create_post
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.create_post(
  p_client_id uuid,
  p_topic text,
  p_body text,
  p_restaurant_id uuid default null,
  p_suggested_name text default null,
  p_suggested_zone text default null,
  p_category_ids smallint[] default '{}',
  p_as_restaurant_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_id uuid;
  v_topic text := p_topic;
  v_restaurant uuid := p_restaurant_id;
  v_suggested text := nullif(btrim(p_suggested_name), '');
  v_zone text := nullif(btrim(p_suggested_zone), '');
  v_body text := btrim(p_body);
  v_cats smallint[];
  v_key text;
  v_posts_today int;
  v_owner uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  -- Doble toque o reintento: devuelve el post que ya existe.
  select id into v_id from public.posts where author_id = v_user and client_id = p_client_id;
  if v_id is not null then
    return v_id;
  end if;

  if exists (select 1 from public.profiles where id = v_user and banned_at is not null) then
    raise exception 'user_banned';
  end if;

  select coalesce(array_agg(distinct c), '{}') into v_cats from unnest(p_category_ids) c;
  if cardinality(v_cats) > 2 then
    raise exception 'too_many_categories';
  end if;

  if p_as_restaurant_id is not null then
    -- Post como local: tema y local fijos, 1 cada 24 h.
    perform public.assert_can_act_as_restaurant(v_user, p_as_restaurant_id);
    if exists (
      select 1 from public.posts
      where as_restaurant_id = p_as_restaurant_id and created_at > now() - interval '24 hours'
    ) then
      raise exception 'owner_post_rate_limited';
    end if;
    v_topic := 'novedades';
    v_restaurant := p_as_restaurant_id;
    v_suggested := null;
    v_zone := null;
  else
    if v_topic not in ('recomiendame', 'locales_nuevos', 'recetas', 'antojos') then
      raise exception 'invalid_topic';
    end if;
    if (
      select count(*) from public.posts
      where author_id = v_user and as_restaurant_id is null
        and created_at > now() - interval '24 hours'
    ) >= 10 then
      raise exception 'post_rate_limited';
    end if;
    if v_restaurant is not null and not public.community_taggable_restaurant(v_restaurant) then
      raise exception 'restaurant_not_found';
    end if;
    if v_restaurant is null and v_suggested is null and cardinality(v_cats) = 0 then
      raise exception 'post_needs_tag';
    end if;
  end if;

  if v_suggested is null then
    v_zone := null;
  end if;

  insert into public.posts (
    author_id, as_restaurant_id, topic, body, restaurant_id,
    suggested_name, suggested_zone, client_id
  )
  values (
    v_user, p_as_restaurant_id, v_topic, v_body, v_restaurant,
    v_suggested, v_zone, p_client_id
  )
  returning id, suggested_key into v_id, v_key;

  insert into public.post_categories (post_id, category_id)
  select v_id, c from unnest(v_cats) c;

  -- Un nombre nuevo abre una sugerencia; uno conocido (incluso descartado)
  -- no cambia su estado.
  if v_key is not null then
    insert into public.local_suggestions (normalized_name)
    values (v_key)
    on conflict (normalized_name) do nothing;
  end if;

  if p_as_restaurant_id is null then
    -- +3 solo por los 3 primeros posts del día.
    select count(*) into v_posts_today
    from public.posts
    where author_id = v_user and as_restaurant_id is null
      and (created_at at time zone 'America/Caracas')::date = public.community_today();
    if v_posts_today <= 3 then
      perform public.award_community_xp(v_user, 3, 'post', 'post:' || v_id, v_id, null);
    end if;
    perform public.grant_mission(v_user, 'first_post');
  end if;

  -- Aviso al dueño del local etiquetado (si no es él quien publica).
  if v_restaurant is not null then
    select owner_id into v_owner from public.restaurants where id = v_restaurant;
    if v_owner is not null and v_owner <> v_user then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        v_owner,
        'post_mention',
        'Mencionaron tu local en Comunidad',
        public.community_snippet(v_body),
        jsonb_build_object('kind', 'post_mention', 'post_id', v_id, 'restaurant_id', v_restaurant)
      );
    end if;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.create_post(uuid, text, text, uuid, text, text, smallint[], uuid) from public, anon;
grant execute on function public.create_post(uuid, text, text, uuid, text, text, smallint[], uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Respuestas
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.before_post_reply_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_status text;
  v_post_restaurant uuid;
begin
  if exists (select 1 from public.profiles where id = new.author_id and banned_at is not null) then
    raise exception 'user_banned';
  end if;

  select moderation, restaurant_id into v_post_status, v_post_restaurant
  from public.posts where id = new.post_id;
  if v_post_status is distinct from 'visible' then
    raise exception 'post_not_available';
  end if;

  new.body := btrim(new.body);
  new.moderation := 'visible';
  new.moderated_at := null;

  if new.as_restaurant_id is not null then
    perform public.assert_can_act_as_restaurant(new.author_id, new.as_restaurant_id);
    if v_post_restaurant is distinct from new.as_restaurant_id then
      raise exception 'owner_reply_not_mentioned';
    end if;
    new.restaurant_id := null;
  else
    if (
      select count(*) from public.post_replies
      where author_id = new.author_id and as_restaurant_id is null
        and created_at > now() - interval '24 hours'
    ) >= 60 then
      raise exception 'reply_rate_limited';
    end if;
    if new.restaurant_id is not null and not public.community_taggable_restaurant(new.restaurant_id) then
      raise exception 'restaurant_not_found';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_post_reply_before_insert on public.post_replies;
create trigger trg_post_reply_before_insert
  before insert on public.post_replies
  for each row execute function public.before_post_reply_insert();

create or replace function public.after_post_reply_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_author uuid;
  v_post_as uuid;
  v_topic text;
  v_recs_today int;
  v_name text;
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.posts set reply_count = reply_count + 1
    where id = new.post_id
    returning author_id, as_restaurant_id, topic into v_post_author, v_post_as, v_topic;
  perform set_config('app.elpoint_privileged', 'off', true);

  if new.as_restaurant_id is null and new.author_id <> v_post_author then
    -- +1 al autor del post, una vez por persona (los posts de local no suman).
    if v_post_as is null then
      perform public.award_community_xp(
        v_post_author, 1, 'reply_received',
        'reply:' || new.post_id || ':' || new.author_id,
        new.post_id, new.author_id
      );
    end if;

    -- +2 por recomendar un local de la app en "Recomiéndame", 5 al día.
    if v_topic = 'recomiendame' and new.restaurant_id is not null then
      select count(*) into v_recs_today
      from public.community_xp_log
      where user_id = new.author_id and reason = 'recommendation'
        and day = public.community_today() and not reverted;
      if v_recs_today < 5 then
        perform public.award_community_xp(
          new.author_id, 2, 'recommendation', 'rec:' || new.id, new.post_id, null
        );
      end if;
    end if;
  end if;

  if new.author_id <> v_post_author then
    if new.as_restaurant_id is not null then
      select name into v_name from public.restaurants where id = new.as_restaurant_id;
    else
      select coalesce(full_name, username) into v_name from public.profiles where id = new.author_id;
    end if;
    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      v_post_author,
      'post_reply',
      coalesce(v_name, 'Alguien') || ' respondió tu post',
      public.community_snippet(new.body),
      jsonb_build_object('kind', 'post', 'post_id', new.post_id)
    );
  end if;
  return null;
end;
$$;

drop trigger if exists trg_post_reply_after_insert on public.post_replies;
create trigger trg_post_reply_after_insert
  after insert on public.post_replies
  for each row execute function public.after_post_reply_insert();

create or replace function public.after_post_reply_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.posts set reply_count = greatest(0, reply_count - 1) where id = old.post_id;
  perform set_config('app.elpoint_privileged', 'off', true);

  perform public.revert_community_xp('rec:' || old.id);

  if not exists (
    select 1 from public.post_replies
    where post_id = old.post_id and author_id = old.author_id and as_restaurant_id is null
  ) then
    perform public.revert_community_xp('reply:' || old.post_id || ':' || old.author_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_post_reply_after_delete on public.post_replies;
create trigger trg_post_reply_after_delete
  after delete on public.post_replies
  for each row execute function public.after_post_reply_delete();

-- ═══════════════════════════════════════════════════════════════════════════
-- Me gusta: se añade el aviso al trigger de la migración anterior.
-- Si ya hay un aviso sin leer de ese post, no se crea otro (se agrupan).
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.on_post_like_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_as_restaurant uuid;
  v_body text;
  v_name text;
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.posts set like_count = like_count + 1
    where id = new.post_id
    returning author_id, as_restaurant_id, body into v_author, v_as_restaurant, v_body;
  perform set_config('app.elpoint_privileged', 'off', true);

  if v_author is null or v_author = new.user_id then
    return null;
  end if;

  if v_as_restaurant is null then
    perform public.award_community_xp(
      v_author, 1, 'like_received',
      'like:' || new.post_id || ':' || new.user_id,
      new.post_id, new.user_id
    );
  end if;

  if not exists (
    select 1 from public.notifications
    where recipient_id = v_author and type = 'post_like' and not read
      and data ->> 'post_id' = new.post_id::text
  ) then
    select coalesce(full_name, username) into v_name from public.profiles where id = new.user_id;
    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      v_author,
      'post_like',
      'A ' || coalesce(v_name, 'alguien') || ' le gustó tu post',
      public.community_snippet(v_body),
      jsonb_build_object('kind', 'post', 'post_id', new.post_id)
    );
  end if;
  return null;
end;
$$;
