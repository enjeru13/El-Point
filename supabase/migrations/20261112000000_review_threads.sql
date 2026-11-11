-- Hilos en las reseñas de Comunidad.
--
-- Una reseña vive en `reviews`, no en `posts`, y las respuestas solo cuelgan de
-- posts. En vez de duplicar todo (avisos, menciones, XP, moderación, límites),
-- cada reseña que recibe una respuesta tiene un "post-hilo": una fila de `posts`
-- ligada a la reseña (posts.review_id). Las respuestas cuelgan de ese post y
-- reutilizan todo lo que ya existe.
--
--   * posts.review_id: una reseña tiene a lo más un post-hilo.
--   * open_review_thread(review): crea el post-hilo si no existe y devuelve su id.
--   * community_feed: los post-hilos no salen como posts. Las reseñas traen
--     thread_post_id y su conteo de respuestas, y el detalle de un hilo se
--     devuelve con forma de reseña (estrellas, local, fotos).
--   * Moderación: si la reseña se oculta o retira, su hilo también.
--   * Avisos: "respondió tu reseña". El perfil y el enlace público ignoran los hilos.

alter table public.posts
  add column if not exists review_id uuid unique references public.reviews (id) on delete cascade;

alter table public.posts drop constraint if exists posts_topic_check;
alter table public.posts
  add constraint posts_topic_check
  check (topic in ('recomiendame', 'locales_nuevos', 'recetas', 'antojos', 'novedades', 'resenas'));

-- ─── Abrir (o crear) el hilo de una reseña ─────────────────────────────────
create or replace function public.open_review_thread(p_review uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_author uuid;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;

  select rv.author_id into v_author
  from public.reviews rv
  join public.restaurants r on r.id = rv.restaurant_id
  where rv.id = p_review
    and rv.moderation = 'visible'
    and r.status = 'approved' and r.is_active;
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_user and b.blocked_id = v_author)
       or (b.blocker_id = v_author and b.blocked_id = v_user)) then
    raise exception 'blocked' using errcode = '42501';
  end if;

  select id into v_id from public.posts where review_id = p_review;
  if v_id is null then
    -- Sin pasar por create_post: no suma XP ni cuenta como una publicación.
    insert into public.posts (author_id, topic, body, client_id, review_id)
    values (v_author, 'resenas', 'Hilo de reseña', gen_random_uuid(), p_review)
    on conflict (review_id) do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from public.posts where review_id = p_review;
    end if;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.open_review_thread(uuid) from public, anon;
grant execute on function public.open_review_thread(uuid) to authenticated;

-- ─── Si la reseña se oculta o se retira, su hilo también ───────────────────
create or replace function public.sync_review_thread_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.moderation is distinct from old.moderation then
    perform set_config('app.elpoint_privileged', 'on', true);
    update public.posts
      set moderation = case when new.moderation = 'visible' then 'visible' else 'hidden' end,
          moderated_at = now()
      where review_id = new.id;
    perform set_config('app.elpoint_privileged', 'off', true);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_review_thread_moderation on public.reviews;
create trigger trg_sync_review_thread_moderation
  after update of moderation on public.reviews
  for each row execute function public.sync_review_thread_moderation();

-- ─── Feed: la función cambia de firma (dos columnas más) ───────────────────
drop function if exists public.community_feed(text, smallint, uuid, text, timestamptz, uuid, int, uuid);

create or replace function public.community_feed(
  p_topic text default null,
  p_category smallint default null,
  p_restaurant uuid default null,
  p_query text default null,
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit int default 20,
  p_post uuid default null
)
returns table (
  kind text,
  id uuid,
  created_at timestamptz,
  topic text,
  body text,
  rating smallint,
  author_id uuid,
  author_name text,
  author_avatar text,
  author_level int,
  as_restaurant_id uuid,
  as_restaurant_name text,
  as_restaurant_logo text,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_category text,
  restaurant_zone text,
  suggested_name text,
  suggested_zone text,
  category_ids smallint[],
  photo_paths text[],
  like_count int,
  reply_count int,
  viewer_liked boolean,
  review_id uuid,
  thread_post_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  with
  viewer as (select (select auth.uid()) as uid),
  q as (select nullif(lower(btrim(p_query)), '') as text),
  lim as (select least(greatest(coalesce(p_limit, 20), 1), 50) as n),

  post_rows as (
    select
      'post'::text as kind,
      p.id,
      p.created_at,
      p.topic,
      p.body,
      null::smallint as rating,
      p.author_id,
      p.as_restaurant_id,
      coalesce(p.restaurant_id, ls.restaurant_id) as tagged_restaurant,
      p.suggested_name,
      p.suggested_zone,
      p.like_count,
      p.reply_count,
      null::uuid as review_id,
      null::uuid as thread_post_id
    from public.posts p
    left join public.local_suggestions ls
      on ls.normalized_name = p.suggested_key and ls.status = 'alta'
    where p.moderation = 'visible'
      and p.review_id is null
      and (p_post is null or p.id = p_post)
      and (p_topic is null or (p_topic <> 'resenas' and p.topic = p_topic))
      and (p_category is null or exists (
        select 1 from public.post_categories pc where pc.post_id = p.id and pc.category_id = p_category))
      and (p_restaurant is null or coalesce(p.restaurant_id, ls.restaurant_id) = p_restaurant)
      and (p_before_at is null or (p.created_at, p.id) < (p_before_at, p_before_id))
      and not exists (
        select 1 from public.user_blocks b, viewer v
        where b.blocker_id = v.uid and b.blocked_id = p.author_id)
      and ((select text from q) is null
        or position((select text from q) in lower(p.body)) > 0
        or exists (
          select 1 from public.restaurants r
          where r.id = coalesce(p.restaurant_id, ls.restaurant_id)
            and position((select text from q) in lower(r.name)) > 0))
    order by p.created_at desc, p.id desc
    limit (select n from lim)
  ),

  review_rows as (
    select
      'review'::text as kind,
      rv.id,
      rv.created_at,
      'resenas'::text as topic,
      rv.body,
      rv.rating,
      rv.author_id,
      null::uuid as as_restaurant_id,
      rv.restaurant_id as tagged_restaurant,
      null::text as suggested_name,
      null::text as suggested_zone,
      rv.helpful_count as like_count,
      coalesce(tp.reply_count, 0) as reply_count,
      rv.id as review_id,
      tp.id as thread_post_id
    from public.reviews rv
    join public.restaurants r on r.id = rv.restaurant_id
    left join public.posts tp on tp.review_id = rv.id and tp.moderation = 'visible'
    where rv.moderation = 'visible'
      and r.status = 'approved' and r.is_active
      and p_restaurant is null
      and p_post is null
      and (p_topic is null or p_topic = 'resenas')
      and (p_category is null or exists (
        select 1 from public.restaurant_categories rc
        where rc.restaurant_id = rv.restaurant_id and rc.category_id = p_category))
      and (p_before_at is null or (rv.created_at, rv.id) < (p_before_at, p_before_id))
      and not exists (
        select 1 from public.user_blocks b, viewer v
        where b.blocker_id = v.uid and b.blocked_id = rv.author_id)
      and ((select text from q) is null
        or position((select text from q) in lower(rv.body)) > 0
        or position((select text from q) in lower(r.name)) > 0)
    order by rv.created_at desc, rv.id desc
    limit (select n from lim)
  ),

  -- El detalle de un hilo de reseña: se ve como la reseña (estrellas, local,
  -- fotos), pero su id es el del post-hilo, que es de donde cuelgan las respuestas.
  thread_rows as (
    select
      'review'::text as kind,
      p.id,
      rv.created_at,
      'resenas'::text as topic,
      rv.body,
      rv.rating,
      rv.author_id,
      null::uuid as as_restaurant_id,
      rv.restaurant_id as tagged_restaurant,
      null::text as suggested_name,
      null::text as suggested_zone,
      rv.helpful_count as like_count,
      p.reply_count,
      rv.id as review_id,
      p.id as thread_post_id
    from public.posts p
    join public.reviews rv on rv.id = p.review_id and rv.moderation = 'visible'
    join public.restaurants r on r.id = rv.restaurant_id and r.status = 'approved' and r.is_active
    where p_post is not null
      and p.id = p_post
      and p.moderation = 'visible'
      and not exists (
        select 1 from public.user_blocks b, viewer v
        where b.blocker_id = v.uid and b.blocked_id = rv.author_id)
  ),

  page as (
    select * from (
      select * from post_rows
      union all
      select * from review_rows
      union all
      select * from thread_rows
    ) u
    order by u.created_at desc, u.id desc
    limit (select n from lim)
  )

  select
    pg.kind,
    pg.id,
    pg.created_at,
    pg.topic,
    pg.body,
    pg.rating,
    -- Sin cuenta no se entregan ids de personas (el visitante solo lee).
    case when (select auth.uid()) is null then null else pg.author_id end,
    coalesce(au.full_name, au.username),
    au.avatar_url,
    au.level,
    pg.as_restaurant_id,
    ar.name,
    ar.logo_url,
    pg.tagged_restaurant,
    tr.name,
    (select c.label
       from public.restaurant_categories rc
       join public.categories c on c.id = rc.category_id
      where rc.restaurant_id = pg.tagged_restaurant
      order by c.sort_order, c.id
      limit 1),
    coalesce(tr.zone_label, tr.address),
    pg.suggested_name,
    pg.suggested_zone,
    case when pg.kind = 'post' then
      coalesce((select array_agg(pc.category_id order by pc.category_id)
                from public.post_categories pc where pc.post_id = pg.id), '{}')
    else '{}'::smallint[] end,
    case when pg.kind = 'post' then
      coalesce((select array_agg(ph.storage_path order by ph.position)
                from public.post_photos ph where ph.post_id = pg.id), '{}')
    else
      coalesce((select array_agg(rp.storage_path order by rp.position, rp.created_at)
                from public.review_photos rp where rp.review_id = coalesce(pg.review_id, pg.id)), '{}')
    end,
    pg.like_count,
    pg.reply_count,
    case when pg.kind = 'post' then
      exists (select 1 from public.post_likes l, viewer v where l.post_id = pg.id and l.user_id = v.uid)
    else
      exists (select 1 from public.review_helpful h, viewer v where h.review_id = coalesce(pg.review_id, pg.id) and h.user_id = v.uid)
    end,
    pg.review_id,
    pg.thread_post_id
  from page pg
  left join public.profiles au on au.id = pg.author_id
  left join public.restaurants ar on ar.id = pg.as_restaurant_id
  left join public.restaurants tr on tr.id = pg.tagged_restaurant
  order by pg.created_at desc, pg.id desc;
$$;

-- Un visitante sin cuenta puede leer Comunidad (sin ids de personas ni "me gusta" propios).
revoke execute on function public.community_feed(text, smallint, uuid, text, timestamptz, uuid, int, uuid) from public;
grant execute on function public.community_feed(text, smallint, uuid, text, timestamptz, uuid, int, uuid) to anon, authenticated;

-- ─── Avisos, enlace público y perfil: ahora conocen los hilos ──────────────
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
  v_review uuid;
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.posts set reply_count = reply_count + 1
    where id = new.post_id
    returning author_id, as_restaurant_id, topic, review_id into v_post_author, v_post_as, v_topic, v_review;
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
      -- El mismo candado que award_community_xp: dos respuestas a la vez no
      -- pueden contar las dos "4 de 5".
      perform pg_advisory_xact_lock(hashtextextended('community_xp:' || new.author_id::text, 0));
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

  if new.author_id <> v_post_author
     and not exists (
       select 1 from public.user_blocks
       where blocker_id = v_post_author and blocked_id = new.author_id) then
    if new.as_restaurant_id is not null then
      select name into v_name from public.restaurants where id = new.as_restaurant_id;
    else
      select coalesce(full_name, username) into v_name from public.profiles where id = new.author_id;
    end if;
    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      v_post_author,
      'post_reply',
      coalesce(v_name, 'Alguien') || case when v_review is null then ' respondió tu post' else ' respondió tu reseña' end,
      public.community_snippet(new.body),
      jsonb_build_object('kind', 'post', 'post_id', new.post_id)
    );
  end if;
  return null;
end;
$$;

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
    and p.review_id is null
    and p.moderation = 'visible'
    and a.banned_at is null;
$$;

create or replace function public.get_public_profile(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'xp', p.xp,
    'level', p.level,
    'rank_count', (select count(*) from public.reviews r where r.author_id = p.id and r.moderation = 'visible'),
    'missions_done', (select count(*) from public.user_missions um where um.user_id = p.id),
    'post_count', (select count(*) from public.posts po
                   where po.author_id = p.id and po.as_restaurant_id is null and po.review_id is null
                     and po.moderation = 'visible')
  )
  from public.profiles p
  where p.id = p_user_id
    and p.banned_at is null
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = p.id and b.blocked_id = (select auth.uid()))
         or (b.blocker_id = (select auth.uid()) and b.blocked_id = p.id));
$$;

revoke execute on function public.sync_review_thread_moderation() from public, anon, authenticated;
revoke execute on function public.get_public_post(uuid) from public;
grant execute on function public.get_public_post(uuid) to anon, authenticated;
revoke execute on function public.get_public_profile(uuid) from public;
grant execute on function public.get_public_profile(uuid) to authenticated;
