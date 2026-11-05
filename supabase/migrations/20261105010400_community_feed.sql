-- ═══════════════════════════════════════════════════════════════════════════
-- Comunidad (5/6): el feed. Una sola consulta paginada por cursor
-- (created_at, id) que mezcla posts y reseñas visibles, sin autores
-- bloqueados por quien mira.
--
-- Filtros (todos opcionales):
--   p_topic       'resenas' = solo reseñas; otro tema = solo posts de ese tema
--   p_category    posts con esa categoría y reseñas de locales de esa categoría
--   p_restaurant  solo posts que etiquetan ese local (directo o por una
--                 sugerencia dada de alta); sin reseñas
--   p_query       texto que aparece en el post/reseña o en el nombre del local
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.community_feed(
  p_topic text default null,
  p_category smallint default null,
  p_restaurant uuid default null,
  p_query text default null,
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit int default 20
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
  viewer_liked boolean
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
      p.reply_count
    from public.posts p
    left join public.local_suggestions ls
      on ls.normalized_name = p.suggested_key and ls.status = 'alta'
    where p.moderation = 'visible'
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
      0 as reply_count
    from public.reviews rv
    join public.restaurants r on r.id = rv.restaurant_id
    where rv.moderation = 'visible'
      and r.status = 'approved' and r.is_active
      and p_restaurant is null
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

  page as (
    select * from (
      select * from post_rows
      union all
      select * from review_rows
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
    pg.author_id,
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
                from public.review_photos rp where rp.review_id = pg.id), '{}')
    end,
    pg.like_count,
    pg.reply_count,
    case when pg.kind = 'post' then
      exists (select 1 from public.post_likes l, viewer v where l.post_id = pg.id and l.user_id = v.uid)
    else
      exists (select 1 from public.review_helpful h, viewer v where h.review_id = pg.id and h.user_id = v.uid)
    end
  from page pg
  left join public.profiles au on au.id = pg.author_id
  left join public.restaurants ar on ar.id = pg.as_restaurant_id
  left join public.restaurants tr on tr.id = pg.tagged_restaurant
  order by pg.created_at desc, pg.id desc;
$$;

revoke execute on function public.community_feed(text, smallint, uuid, text, timestamptz, uuid, int) from public, anon;
grant execute on function public.community_feed(text, smallint, uuid, text, timestamptz, uuid, int) to authenticated;

-- Para el cursor de reseñas.
create index if not exists reviews_feed_idx
  on public.reviews (created_at desc, id desc) where moderation = 'visible';
