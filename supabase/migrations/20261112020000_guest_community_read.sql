-- Comunidad en lectura para quien abre la app sin cuenta.
--
-- Las tablas de Comunidad (posts, respuestas, perfiles) siguen cerradas al
-- visitante. Lo que se abre son dos funciones de solo lectura que ya filtran
-- lo oculto y lo retirado:
--   * community_feed y poll_states: ya traen solo contenido visible; sin cuenta
--     no devuelven ids de personas (ver 20261112000000_review_threads.sql).
--   * public_post_replies(post): las respuestas de un post, con el nombre y la
--     foto de quien responde pero sin su id, para el detalle de una publicación.

grant execute on function public.poll_states(uuid[]) to anon;

create or replace function public.public_post_replies(p_post uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.j order by x.created_at), '[]'::jsonb)
  from (
    select rp.created_at,
           jsonb_build_object(
             'id', rp.id,
             'post_id', rp.post_id,
             'parent_reply_id', rp.parent_reply_id,
             'like_count', rp.like_count,
             'author_deleted_at', rp.author_deleted_at,
             'body', case when rp.author_deleted_at is not null then '' else rp.body end,
             'created_at', rp.created_at,
             'restaurant_id', rp.restaurant_id,
             'restaurant', case when rr.id is not null then jsonb_build_object('name', rr.name) end,
             'as_restaurant', case when ar.id is not null
               then jsonb_build_object('name', ar.name, 'logo_url', ar.logo_url) end,
             'author', jsonb_build_object(
               'full_name', case when rp.as_restaurant_id is null then a.full_name end,
               'username', case when rp.as_restaurant_id is null then a.username end,
               'avatar_url', case when rp.as_restaurant_id is null then a.avatar_url end)
           ) as j
    from public.post_replies rp
    join public.posts p on p.id = rp.post_id and p.moderation = 'visible'
    join public.profiles a on a.id = rp.author_id and a.banned_at is null
    left join public.restaurants ar on ar.id = rp.as_restaurant_id
    left join public.restaurants rr on rr.id = rp.restaurant_id and rr.status = 'approved' and rr.is_active
    where rp.post_id = p_post
      and rp.moderation = 'visible'
  ) x;
$$;

revoke execute on function public.public_post_replies(uuid) from public;
grant execute on function public.public_post_replies(uuid) to anon, authenticated;
