-- Comunidad 2 (3/4): encuestas.
--
-- Una publicación puede llevar una encuesta de 2 a 4 opciones (texto o un
-- local de la app) que dura 1, 3 o 7 días. Votos anónimos (solo totales),
-- se puede cambiar el voto mientras está abierta, el primer voto da 2 XP.
-- Los resultados se ven después de votar o al cerrar. Un cron avisa a quien
-- la creó cuando termina.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'like', 'reply', 'levelup', 'levelup_soon', 'promo', 'review', 'weekly',
    'moderation', 'mission', 'streak', 'sub_expiring', 'sub_expired', 'plan_active',
    'post_like', 'post_reply', 'post_mention',
    'reply_like', 'reply_reply', 'user_mention', 'poll_ended'
  ));

alter table public.community_xp_log drop constraint if exists community_xp_log_reason_check;
alter table public.community_xp_log
  add constraint community_xp_log_reason_check
  check (reason in ('post', 'like_received', 'reply_received', 'recommendation', 'suggestion_alta',
                    'reply_like_received', 'poll_vote'));

create table if not exists public.post_polls (
  post_id uuid primary key references public.posts (id) on delete cascade,
  closes_at timestamptz not null,
  ended_notified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.post_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.post_polls (post_id) on delete cascade,
  position smallint not null,
  label text check (label is null or char_length(btrim(label)) between 1 and 60),
  restaurant_id uuid references public.restaurants (id) on delete set null,
  constraint post_poll_options_one check ((label is null) <> (restaurant_id is null)),
  unique (post_id, position)
);

create table if not exists public.post_poll_votes (
  post_id uuid not null references public.post_polls (post_id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_id uuid not null references public.post_poll_options (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_poll_votes_option on public.post_poll_votes (option_id);
create index if not exists post_polls_due on public.post_polls (closes_at) where not ended_notified;

alter table public.post_polls enable row level security;
alter table public.post_poll_options enable row level security;
alter table public.post_poll_votes enable row level security;

drop policy if exists "polls readable" on public.post_polls;
create policy "polls readable" on public.post_polls for select to authenticated using (true);
drop policy if exists "poll options readable" on public.post_poll_options;
create policy "poll options readable" on public.post_poll_options for select to authenticated using (true);
drop policy if exists "own vote readable" on public.post_poll_votes;
create policy "own vote readable" on public.post_poll_votes for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.post_polls, public.post_poll_options, public.post_poll_votes to authenticated;

-- ─── Estado de una encuesta ────────────────────────────────────────────────
create or replace function public.poll_state_for(p_post_id uuid, p_user uuid, p_reveal boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with poll as (select * from public.post_polls where post_id = p_post_id),
  mine as (select option_id from public.post_poll_votes where post_id = p_post_id and user_id = p_user),
  counts as (
    select o.id, o.position, o.label, o.restaurant_id, r.name as restaurant_name,
           (select count(*) from public.post_poll_votes v where v.option_id = o.id) as votes
    from public.post_poll_options o
    left join public.restaurants r on r.id = o.restaurant_id
    where o.post_id = p_post_id
  ),
  show as (
    select p_reveal or exists (select 1 from mine) or (select closes_at <= now() from poll) as v
  )
  select case when not exists (select 1 from poll) then null else jsonb_build_object(
    'closes_at', (select closes_at from poll),
    'closed', (select closes_at <= now() from poll),
    'total', (select count(*) from public.post_poll_votes where post_id = p_post_id),
    'my_option', (select option_id from mine),
    'options', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'label', c.label,
        'restaurant', case when c.restaurant_id is null then null
                      else jsonb_build_object('id', c.restaurant_id, 'name', c.restaurant_name) end,
        'votes', case when (select v from show) then c.votes else null end
      ) order by c.position), '[]'::jsonb)
      from counts c)
  ) end;
$$;

create or replace function public.poll_state(p_post_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.poll_state_for(p_post_id, (select auth.uid()), false);
$$;

-- Varias de una vez, para una página del feed: {post_id: estado}.
create or replace function public.poll_states(p_post_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(pp.post_id, public.poll_state_for(pp.post_id, (select auth.uid()), false)), '{}'::jsonb)
  from public.post_polls pp
  where pp.post_id = any (p_post_ids);
$$;

-- ─── Crear ─────────────────────────────────────────────────────────────────
create or replace function public.create_poll(p_post_id uuid, p_days int, p_options jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_opt jsonb;
  v_pos smallint := 0;
  v_label text;
  v_restaurant uuid;
begin
  if not exists (select 1 from public.posts where id = p_post_id and author_id = v_uid and moderation = 'visible') then
    raise exception 'not_authorized';
  end if;
  if exists (select 1 from public.post_polls where post_id = p_post_id) then
    raise exception 'poll_exists';
  end if;
  if p_days not in (1, 3, 7) then
    raise exception 'poll_invalid_days';
  end if;
  if jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) not between 2 and 4 then
    raise exception 'poll_invalid_options';
  end if;

  insert into public.post_polls (post_id, closes_at) values (p_post_id, now() + make_interval(days => p_days));

  for v_opt in select * from jsonb_array_elements(p_options) loop
    v_label := nullif(btrim(v_opt ->> 'label'), '');
    v_restaurant := nullif(v_opt ->> 'restaurant_id', '')::uuid;
    if (v_label is null) = (v_restaurant is null) then
      raise exception 'poll_invalid_options';
    end if;
    if v_restaurant is not null and not public.community_taggable_restaurant(v_restaurant) then
      raise exception 'restaurant_not_found';
    end if;
    v_pos := v_pos + 1;
    insert into public.post_poll_options (post_id, position, label, restaurant_id)
    values (p_post_id, v_pos, v_label, v_restaurant);
  end loop;
end;
$$;

-- ─── Votar ─────────────────────────────────────────────────────────────────
create or replace function public.vote_poll(p_post_id uuid, p_option_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_closes timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and banned_at is not null) then
    raise exception 'user_banned';
  end if;
  select closes_at into v_closes from public.post_polls where post_id = p_post_id;
  if v_closes is null then
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

  perform public.award_community_xp(v_uid, 2, 'poll_vote', 'vote:' || p_post_id || ':' || v_uid, p_post_id, null);

  return public.poll_state_for(p_post_id, v_uid, false);
end;
$$;

-- ─── Cerrar y avisar ───────────────────────────────────────────────────────
create or replace function public.close_due_polls()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_poll record;
  v_total int;
  v_winner text;
  v_votes int;
  v_n int := 0;
begin
  for v_poll in
    select pp.post_id, p.author_id
    from public.post_polls pp
    join public.posts p on p.id = pp.post_id
    where pp.closes_at <= now() and not pp.ended_notified
    for update of pp skip locked
  loop
    select count(*) into v_total from public.post_poll_votes where post_id = v_poll.post_id;
    select coalesce(o.label, r.name), count(v.*)
      into v_winner, v_votes
    from public.post_poll_options o
    left join public.restaurants r on r.id = o.restaurant_id
    left join public.post_poll_votes v on v.option_id = o.id
    where o.post_id = v_poll.post_id
    group by o.id, o.position, o.label, r.name
    order by count(v.*) desc, o.position
    limit 1;

    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      v_poll.author_id,
      'poll_ended',
      case when v_total = 0 then 'Tu encuesta terminó sin votos'
           else 'Tu encuesta terminó: ganó ' || coalesce(v_winner, '—') || ' con '
                || round(100.0 * v_votes / v_total) || '%' end,
      v_total || case when v_total = 1 then ' voto' else ' votos' end,
      jsonb_build_object('kind', 'post', 'post_id', v_poll.post_id)
    );
    update public.post_polls set ended_notified = true where post_id = v_poll.post_id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

revoke execute on function public.poll_state_for(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.close_due_polls() from public, anon, authenticated;
revoke execute on function public.poll_state(uuid) from public, anon;
revoke execute on function public.poll_states(uuid[]) from public, anon;
revoke execute on function public.create_poll(uuid, int, jsonb) from public, anon;
revoke execute on function public.vote_poll(uuid, uuid) from public, anon;
grant execute on function public.poll_state(uuid) to authenticated;
grant execute on function public.poll_states(uuid[]) to authenticated;
grant execute on function public.create_poll(uuid, int, jsonb) to authenticated;
grant execute on function public.vote_poll(uuid, uuid) to authenticated;

-- Cada 15 minutos.
do $$
begin
  perform cron.unschedule('close-polls') where exists (select 1 from cron.job where jobname = 'close-polls');
  perform cron.schedule('close-polls', '*/15 * * * *', 'select public.close_due_polls();');
end $$;
