-- ═══════════════════════════════════════════════════════════════════════════
-- Arreglos de la revisión final de Comunidad.
--
-- 1. Guardas de columnas (anterior a Comunidad). Las funciones guard_* eran
--    SECURITY DEFINER, así que dentro de ellas current_user siempre es el
--    dueño (postgres) e is_trusted_writer() siempre daba true: cualquier
--    usuario podía cambiar por la API su xp, nivel, strikes, baneo o is_admin.
--    Pasan a SECURITY INVOKER: un PATCH de la app corre como "authenticated"
--    y queda protegido; las funciones internas (SECURITY DEFINER, de
--    postgres) y el SQL directo siguen pudiendo escribir.
-- 2. Columnas de plan y de Comunidad en restaurants. Los "revoke update
--    (columna)" no tenían efecto mientras existe el grant de la tabla
--    entera; ahora las protege un trigger.
-- 3. post_replies: sin insert/update de tabla entera (solo las columnas
--    permitidas) y la fecha la pone el servidor.
-- 4. create_post: dos toques simultáneos devuelven el mismo post.
-- 5. Un local puede responder donde lo mencionan por sugerencia dada de alta.
-- 6. Me gusta en posts no visibles: sin XP ni aviso, y nada se le avisa a
--    quien bloqueó al que da me gusta o responde.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Guardas como SECURITY INVOKER ──────────────────────────────────────
alter function public.guard_protected_profile_cols() security invoker;
alter function public.guard_review_moderation_cols() security invoker;
alter function public.guard_restaurant_status() security invoker;
alter function public.guard_restaurant_derived_cols() security invoker;
alter function public.guard_review_cols() security invoker;

-- ─── 2. Columnas protegidas de restaurants ─────────────────────────────────
create or replace function public.guard_restaurant_protected_cols()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  new.paid_until          := old.paid_until;
  new.boost_until         := old.boost_until;
  new.founder_rank        := old.founder_rank;
  new.plan_period_start   := old.plan_period_start;
  new.plan_kind           := old.plan_kind;
  new.community_banned_at := old.community_banned_at;
  new.community_removals  := old.community_removals;
  new.owner_id            := old.owner_id;
  return new;
end;
$$;

drop trigger if exists trg_guard_restaurant_protected on public.restaurants;
create trigger trg_guard_restaurant_protected
  before update on public.restaurants
  for each row execute function public.guard_restaurant_protected_cols();

-- ─── 3. post_replies: solo las columnas permitidas ─────────────────────────
revoke insert, update on public.post_replies from authenticated;
grant insert (post_id, author_id, as_restaurant_id, restaurant_id, body) on public.post_replies to authenticated;
grant update (moderation, moderated_at) on public.post_replies to authenticated;

-- ─── 4 a 6. Funciones de Comunidad ─────────────────────────────────────────
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

  -- Doble toque o reintento: devuelve el post que ya existe. El candado
  -- hace esperar a la segunda llamada simultánea hasta que la primera
  -- termine, así encuentra el post en vez de chocar con el índice único.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_client_id::text, 0));
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

  -- El local mencionado puede venir por etiqueta o por una sugerencia que
  -- el admin ya dio de alta con ese local.
  select p.moderation,
         coalesce(p.restaurant_id, (
           select ls.restaurant_id from public.local_suggestions ls
           where ls.normalized_name = p.suggested_key and ls.status = 'alta'))
    into v_post_status, v_post_restaurant
  from public.posts p where p.id = new.post_id;
  if v_post_status is distinct from 'visible' then
    raise exception 'post_not_available';
  end if;

  new.body := btrim(new.body);
  -- La fecha la pone el servidor: así nadie esquiva el límite diario.
  new.created_at := now();
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
      coalesce(v_name, 'Alguien') || ' respondió tu post',
      public.community_snippet(new.body),
      jsonb_build_object('kind', 'post', 'post_id', new.post_id)
    );
  end if;
  return null;
end;
$$;

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
  v_moderation text;
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.posts set like_count = like_count + 1
    where id = new.post_id
    returning author_id, as_restaurant_id, body, moderation
      into v_author, v_as_restaurant, v_body, v_moderation;
  perform set_config('app.elpoint_privileged', 'off', true);

  if v_author is null or v_author = new.user_id or v_moderation <> 'visible' then
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
    select 1 from public.user_blocks
    where blocker_id = v_author and blocked_id = new.user_id
  ) and not exists (
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

-- ─── 7. Reintento de fotos: el autor puede reemplazar el archivo que subió ─
drop policy if exists "post-photos author update" on storage.objects;
create policy "post-photos author update"
  on storage.objects for update to authenticated
  using (bucket_id = 'post-photos' and public.owns_post_path(name))
  with check (bucket_id = 'post-photos' and public.owns_post_path(name));

-- Las políticas de storage llaman a esta función como "authenticated".
grant execute on function public.owns_post_path(text) to authenticated;
