-- Comunidad: feed combinado (migración 20261105010400).
-- Todo lleva la marca "zzqfeed" en el texto para no mezclarse con datos reales.

create temp table _f as
select pg_temp.new_user('Ana') as a,
       pg_temp.new_user('Vero') as v,
       gen_random_uuid() as resto,
       gen_random_uuid() as p1,
       gen_random_uuid() as p2,
       gen_random_uuid() as p3,
       gen_random_uuid() as ph,
       gen_random_uuid() as r;
grant select on _f to authenticated;

insert into public.restaurants (id, name, status, is_active)
select resto, 'Local Feed', 'approved', true from _f;

insert into public.posts (id, author_id, topic, body, client_id, created_at)
select p1, a, 'antojos', 'zzqfeed uno', gen_random_uuid(), now() - interval '4 min' from _f
union all
select p2, v, 'recetas', 'zzqfeed dos', gen_random_uuid(), now() - interval '1 min' from _f;

insert into public.posts (id, author_id, topic, body, client_id, created_at, moderation)
select ph, a, 'antojos', 'zzqfeed oculto', gen_random_uuid(), now() - interval '2 min', 'hidden' from _f;

insert into public.reviews (id, restaurant_id, author_id, rating, body, created_at)
select r, resto, a, 5, 'zzqfeed reseña muy buena', now() - interval '3 min' from _f;

insert into public.post_likes (user_id, post_id) select v, p1 from _f;

create function pg_temp.feed_ids(
  p_topic text default null, p_restaurant uuid default null,
  p_before_at timestamptz default null, p_before_id uuid default null, p_limit int default 20
) returns uuid[] language plpgsql as $$
declare v uuid[];
begin
  perform pg_temp.act_as((select _f.v from _f));
  select array_agg(f.id order by f.created_at desc, f.id desc) into v
  from public.community_feed(p_topic, null, p_restaurant, 'zzqfeed', p_before_at, p_before_id, p_limit) f;
  perform pg_temp.as_admin_db();
  return coalesce(v, '{}');
end $$;

-- feed_mezcla_y_ordena (el oculto no sale)
select pg_temp.ok(
  pg_temp.feed_ids() = (select array[p2, r, p1] from _f),
  'feed_mezcla_y_ordena y feed_oculta_no_visibles');

-- feed_cursor_sin_duplicados
select pg_temp.ok(
  pg_temp.feed_ids(p_limit => 2) = (select array[p2, r] from _f),
  'primera página de 2');
select pg_temp.ok(
  pg_temp.feed_ids(
    p_before_at => (select created_at from public.reviews where id = (select r from _f)),
    p_before_id => (select r from _f),
    p_limit => 2) = (select array[p1] from _f),
  'feed_cursor_sin_duplicados');

-- feed_filtra_tema_resenas
select pg_temp.ok(pg_temp.feed_ids('resenas') = (select array[r] from _f), 'feed_filtra_tema_resenas');
select pg_temp.ok(pg_temp.feed_ids('recetas') = (select array[p2] from _f), 'feed_filtra_tema_recetas');

-- viewer_liked
select pg_temp.act_as((select v from _f));
select pg_temp.ok(
  (select viewer_liked from public.community_feed(null, null, null, 'zzqfeed') f where f.id = (select p1 from _f)),
  'viewer_liked');
select pg_temp.as_admin_db();

-- feed_por_local_incluye_sugerencia_alta
insert into public.posts (id, author_id, topic, body, suggested_name, client_id)
select p3, a, 'locales_nuevos', 'zzqfeed descubrí este', 'Fogón Feed', gen_random_uuid() from _f;
insert into public.local_suggestions (normalized_name, status, restaurant_id)
select 'fogon feed', 'alta', resto from _f;
select pg_temp.ok(
  pg_temp.feed_ids(p_restaurant => (select resto from _f)) = (select array[p3] from _f),
  'feed_por_local_incluye_sugerencia_alta');
select pg_temp.act_as((select v from _f));
select pg_temp.ok(
  (select restaurant_name from public.community_feed(null, null, null, 'zzqfeed') f where f.id = (select p3 from _f))
    = 'Local Feed',
  'la sugerencia en alta muestra el local');
select pg_temp.as_admin_db();

-- p_post: un post visible sale solo; uno oculto no sale.
select pg_temp.act_as((select v from _f));
select pg_temp.ok(
  (select array_agg(f.id) from public.community_feed(p_post => (select p1 from _f))) = (select array[p1] from _f),
  'p_post devuelve ese post');
select pg_temp.ok(
  not exists (select 1 from public.community_feed(p_post => (select ph from _f))),
  'p_post no devuelve un post oculto');
select pg_temp.as_admin_db();

-- feed_hides_blocked_authors: Vero bloquea a Ana.
insert into public.user_blocks (blocker_id, blocked_id) select v, a from _f;
select pg_temp.ok(pg_temp.feed_ids() = (select array[p2] from _f), 'feed_hides_blocked_authors');

drop table _f;
