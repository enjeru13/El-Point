-- ═══════════════════════════════════════════════════════════════════════════
-- Comunidad: detalles de la revisión final, pensando en quien la usa.
--
--  1. Nombres sugeridos: la puntuación ya no separa grupos
--     ("Pollos D'Arturo" = "Pollos DArturo", "Fogón de Mamá." = "Fogón de Mamá").
--  2. El contador de respuestas cuenta solo las visibles.
--  3. Un post o respuesta en revisión no se puede borrar para esquivar la
--     decisión del moderador.
--  4. "¡Subiste al nivel N!" llega una sola vez por nivel.
--  5. El tope de 5 recomendaciones al día aguanta respuestas simultáneas.
--  6. Las fotos se agregan o cambian solo en los 15 minutos tras publicar, y
--     siempre dentro de la carpeta del propio post.
--  7. Al autor le avisamos cuando retiramos su post o respuesta.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Normalización sin puntuación ────────────────────────────────────────
create or replace function public.normalize_place_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    btrim(regexp_replace(
      regexp_replace(
        regexp_replace(
          translate(lower(p_name), 'áéíóúüñàèìòù''’`´', 'aeiouunaeiou'),
          '[^a-z0-9 ]', ' ', 'g'
        ),
        '\m(restaurante|restaurant|el|la|los|las)\M', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )),
    ''
  );
$$;

-- Sugerencias que ahora son el mismo nombre: queda la más avanzada.
delete from public.local_suggestions a
using public.local_suggestions b
where a.normalized_name <> b.normalized_name
  and public.normalize_place_name(a.normalized_name) = public.normalize_place_name(b.normalized_name)
  and (
    array_position(array['pendiente', 'descartado', 'contactado', 'alta'], a.status)
      < array_position(array['pendiente', 'descartado', 'contactado', 'alta'], b.status)
    or (a.status = b.status and a.normalized_name > b.normalized_name)
  );
update public.local_suggestions
  set normalized_name = public.normalize_place_name(normalized_name)
  where normalized_name is distinct from public.normalize_place_name(normalized_name);

-- La clave guardada de cada post se recalcula con la nueva normalización.
select set_config('app.elpoint_privileged', 'on', true);
update public.posts set suggested_name = suggested_name where suggested_name is not null;
select set_config('app.elpoint_privileged', 'off', true);

-- ─── 2. Contador de respuestas = respuestas visibles ───────────────────────
-- Corre después de los demás triggers (orden alfabético) y deja el número
-- exacto, sea alta, baja, ocultar, retirar o restaurar.
create or replace function public.sync_post_reply_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post uuid := coalesce(new.post_id, old.post_id);
begin
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.posts p
    set reply_count = (
      select count(*) from public.post_replies r
      where r.post_id = v_post and r.moderation = 'visible')
    where p.id = v_post;
  perform set_config('app.elpoint_privileged', 'off', true);
  return null;
end;
$$;

drop trigger if exists trg_zz_sync_post_reply_count on public.post_replies;
create trigger trg_zz_sync_post_reply_count
  after insert or delete or update of moderation on public.post_replies
  for each row execute function public.sync_post_reply_count();

select set_config('app.elpoint_privileged', 'on', true);
update public.posts p
  set reply_count = (
    select count(*) from public.post_replies r where r.post_id = p.id and r.moderation = 'visible')
  where reply_count is distinct from (
    select count(*) from public.post_replies r where r.post_id = p.id and r.moderation = 'visible');
select set_config('app.elpoint_privileged', 'off', true);

-- ─── 3. En revisión no se borra ────────────────────────────────────────────
drop policy if exists "author deletes post" on public.posts;
create policy "author deletes post" on public.posts for delete to authenticated
  using (
    (author_id = (select auth.uid()) and moderation = 'visible')
    or public.is_admin((select auth.uid()))
  );

drop policy if exists "author deletes reply" on public.post_replies;
create policy "author deletes reply" on public.post_replies for delete to authenticated
  using (
    (author_id = (select auth.uid()) and moderation = 'visible')
    or public.is_admin((select auth.uid()))
  );

-- ─── 6. Fotos solo al publicar ─────────────────────────────────────────────
create or replace function public.owns_post_path(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.posts p
    where p.id::text = (storage.foldername(object_name))[1]
      and p.author_id = (select auth.uid())
      and p.created_at > now() - interval '15 minutes'
  );
$$;

drop policy if exists "author adds post photo" on public.post_photos;
create policy "author adds post photo" on public.post_photos for insert to authenticated
  with check (
    storage_path = post_id::text || '/' || position
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = (select auth.uid())
        and p.created_at > now() - interval '15 minutes'
    )
  );

drop policy if exists "author removes post photo" on public.post_photos;
create policy "author removes post photo" on public.post_photos for delete to authenticated
  using (exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = (select auth.uid())
      and p.created_at > now() - interval '15 minutes'
  ));

-- ─── 4, 5 y 7. Funciones ────────────────────────────────────────────────────
create or replace function public.award_xp(p_user uuid, p_amount int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_level int;
  new_xp int;
  new_level int;
begin
  update public.profiles
    set xp = greatest(0, xp + p_amount)
    where id = p_user
    returning xp, level into new_xp, old_level;

  if new_xp is null then
    return;
  end if;

  new_level := public.level_for_xp(new_xp);

  if new_level <> old_level then
    update public.profiles set level = new_level where id = p_user;
    -- Solo se avisa la primera vez que llega a ese nivel: quitar y volver a
    -- dar un me gusta no repite el aviso.
    if new_level > old_level and not exists (
      select 1 from public.notifications
      where recipient_id = p_user and type = 'levelup'
        and title like '¡Subiste al nivel ' || new_level || '!%'
    ) then
      insert into public.notifications (recipient_id, type, title, body)
      values (
        p_user,
        'levelup',
        '¡Subiste al nivel ' || new_level || '! · ' || public.rank_for_level(new_level),
        'Sigue rankeando para subir de rango.'
      );
    end if;
  end if;
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
      coalesce(v_name, 'Alguien') || ' respondió tu post',
      public.community_snippet(new.body),
      jsonb_build_object('kind', 'post', 'post_id', new.post_id)
    );
  end if;
  return null;
end;
$$;

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
    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      new.author_id,
      'moderation',
      'Retiramos uno de tus posts',
      'Revisamos los reportes y no cumple las normas de Comunidad: "'
        || public.community_snippet(new.body) || '"',
      jsonb_build_object('kind', 'community_removed', 'post_id', new.id)
    );
  end if;
  return null;
end;
$$;

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
    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      new.author_id,
      'moderation',
      'Retiramos una de tus respuestas',
      'Revisamos los reportes y no cumple las normas de Comunidad: "'
        || public.community_snippet(new.body) || '"',
      jsonb_build_object('kind', 'community_removed', 'post_id', new.post_id)
    );
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
