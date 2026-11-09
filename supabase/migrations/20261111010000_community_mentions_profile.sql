-- Comunidad 2 (2/4): menciones con @ y perfil público.
--
--   * extract_mentions: hasta 5 @usuario distintos por texto.
--   * post_mentions + aviso "user_mention" al publicar o responder. No avisa a
--     quien escribe, ni si hay bloqueo en cualquier dirección, ni a quien ya
--     recibe "respondió tu post/comentario" por ese mismo texto.
--   * get_public_profile: lo que se ve en el perfil de otra persona.
--   * search_mention_users: sugerencias al escribir @.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'like', 'reply', 'levelup', 'levelup_soon', 'promo', 'review', 'weekly',
    'moderation', 'mission', 'streak', 'sub_expiring', 'sub_expired', 'plan_active',
    'post_like', 'post_reply', 'post_mention',
    'reply_like', 'reply_reply', 'user_mention'
  ));

create or replace function public.extract_mentions(p_body text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(u order by first_pos), '{}')
  from (
    select lower(m[1]) as u, min(ord) as first_pos
    from regexp_matches(coalesce(p_body, ''), '(?:^|[^A-Za-z0-9_.@])@([A-Za-z0-9_.]{3,30})', 'g')
      with ordinality as t(m, ord)
    group by lower(m[1])
    order by min(ord)
    limit 5
  ) s;
$$;

create table if not exists public.post_mentions (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  reply_id uuid references public.post_replies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists post_mentions_unique
  on public.post_mentions (post_id, coalesce(reply_id, '00000000-0000-0000-0000-000000000000'::uuid), user_id);
create index if not exists post_mentions_user on public.post_mentions (user_id);

alter table public.post_mentions enable row level security;
drop policy if exists "mentions readable" on public.post_mentions;
create policy "mentions readable" on public.post_mentions for select to authenticated using (true);
grant select on public.post_mentions to authenticated;

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
    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      v_user.id,
      'user_mention',
      coalesce(v_name, 'Alguien') || ' te mencionó',
      public.community_snippet(p_body),
      jsonb_build_object('kind', 'post', 'post_id', p_post_id, 'reply_id', p_reply_id)
    );
  end loop;
end;
$$;

create or replace function public.on_post_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.as_restaurant_id is null then
    perform public.record_mentions(new.id, null, new.author_id, new.body, '{}');
  end if;
  return null;
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
  -- Quien ya recibe "respondió tu post" o "respondió tu comentario" por esta
  -- misma respuesta no recibe además la mención.
  select array_remove(array[
    (select author_id from public.posts where id = new.post_id),
    (select author_id from public.post_replies where id = new.parent_reply_id)
  ], null) into v_skip;
  perform public.record_mentions(new.post_id, new.id, new.author_id, new.body, v_skip);
  return null;
end;
$$;

drop trigger if exists trg_post_mentions on public.posts;
create trigger trg_post_mentions
  after insert on public.posts
  for each row execute function public.on_post_mentions();

drop trigger if exists trg_reply_mentions on public.post_replies;
create trigger trg_reply_mentions
  after insert on public.post_replies
  for each row execute function public.on_reply_mentions();

-- ─── Perfil público ────────────────────────────────────────────────────────
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
                   where po.author_id = p.id and po.as_restaurant_id is null and po.moderation = 'visible')
  )
  from public.profiles p
  where p.id = p_user_id
    and p.banned_at is null
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = p.id and b.blocked_id = (select auth.uid()))
         or (b.blocker_id = (select auth.uid()) and b.blocked_id = p.id));
$$;

create or replace function public.search_mention_users(p_query text, p_post_id uuid default null)
returns table (id uuid, username text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as uid),
  participants as (
    select distinct x.author_id as uid
    from (
      select author_id from public.posts where id = p_post_id and as_restaurant_id is null
      union all
      select author_id from public.post_replies where post_id = p_post_id and as_restaurant_id is null
    ) x
  )
  select p.id, p.username, p.avatar_url
  from public.profiles p, me
  where p.username is not null
    and p.banned_at is null
    and p.id <> me.uid
    and (coalesce(p_query, '') = '' or lower(p.username) like lower(regexp_replace(p_query, '[%_\\]', '', 'g')) || '%')
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = p.id and b.blocked_id = me.uid)
         or (b.blocker_id = me.uid and b.blocked_id = p.id))
  order by (p.id in (select uid from participants)) desc, p.username
  limit 8;
$$;

revoke execute on function public.record_mentions(uuid, uuid, uuid, text, uuid[]) from public, anon, authenticated;
revoke execute on function public.on_post_mentions() from public, anon, authenticated;
revoke execute on function public.on_reply_mentions() from public, anon, authenticated;
revoke execute on function public.get_public_profile(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;
revoke execute on function public.search_mention_users(text, uuid) from public, anon;
grant execute on function public.search_mention_users(text, uuid) to authenticated;
