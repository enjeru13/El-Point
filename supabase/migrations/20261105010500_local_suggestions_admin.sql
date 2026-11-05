-- ═══════════════════════════════════════════════════════════════════════════
-- Comunidad (6/6): locales sugeridos en el panel admin.
--
-- Los posts guardan el nombre que escribió la gente (suggested_name); aquí
-- se agrupan por nombre normalizado. Al pasar una sugerencia a "alta" con
-- el local ya creado, sus posts aparecen enlazados a ese local y quien la
-- sugirió primero gana +25 XP y la misión "Trajiste un local a El Point".
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.admin_local_suggestions()
returns table (
  normalized_name text,
  display_name text,
  status text,
  restaurant_id uuid,
  restaurant_name text,
  post_count int,
  last_zone text,
  last_post_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'forbidden';
  end if;

  return query
  select
    ls.normalized_name,
    (select p.suggested_name from public.posts p
      where p.suggested_key = ls.normalized_name
      order by p.created_at desc limit 1),
    ls.status,
    ls.restaurant_id,
    r.name,
    (select count(*)::int from public.posts p
      where p.suggested_key = ls.normalized_name and p.moderation = 'visible'),
    (select p.suggested_zone from public.posts p
      where p.suggested_key = ls.normalized_name and p.suggested_zone is not null
      order by p.created_at desc limit 1),
    (select max(p.created_at) from public.posts p where p.suggested_key = ls.normalized_name),
    ls.updated_at
  from public.local_suggestions ls
  left join public.restaurants r on r.id = ls.restaurant_id
  where ls.status <> 'descartado'
    and exists (
      select 1 from public.posts p
      where p.suggested_key = ls.normalized_name and p.moderation = 'visible')
  order by
    case ls.status when 'pendiente' then 0 when 'contactado' then 1 else 2 end,
    8 desc nulls last;
end;
$$;

revoke execute on function public.admin_local_suggestions() from public, anon;
grant execute on function public.admin_local_suggestions() to authenticated;

create or replace function public.set_local_suggestion_status(
  p_name text,
  p_status text,
  p_restaurant uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first uuid;
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'forbidden';
  end if;
  if p_status not in ('pendiente', 'contactado', 'alta', 'descartado') then
    raise exception 'invalid_status';
  end if;
  if p_status = 'alta' and p_restaurant is null then
    raise exception 'restaurant_required';
  end if;

  insert into public.local_suggestions (normalized_name, status, restaurant_id, updated_at)
  values (p_name, p_status, case when p_status = 'alta' then p_restaurant end, now())
  on conflict (normalized_name) do update
    set status = excluded.status,
        restaurant_id = case when excluded.status = 'alta' then excluded.restaurant_id
                             else public.local_suggestions.restaurant_id end,
        updated_at = now();

  if p_status = 'alta' then
    select p.author_id into v_first
    from public.posts p
    where p.suggested_key = p_name and p.as_restaurant_id is null and p.moderation = 'visible'
    order by p.created_at, p.id
    limit 1;

    if v_first is not null then
      -- La clave alta:{nombre} garantiza que se paga una sola vez.
      perform public.award_community_xp(v_first, 25, 'suggestion_alta', 'alta:' || p_name, null, null);
      perform public.grant_mission(v_first, 'brought_local');
    end if;
  end if;
end;
$$;

revoke execute on function public.set_local_suggestion_status(text, text, uuid) from public, anon;
grant execute on function public.set_local_suggestion_status(text, text, uuid) to authenticated;

-- El admin puede devolverle a un local el permiso de publicar.
create or replace function public.admin_restore_community(p_restaurant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'forbidden';
  end if;
  perform set_config('app.elpoint_privileged', 'on', true);
  update public.restaurants
    set community_banned_at = null, community_removals = 0
    where id = p_restaurant;
  perform set_config('app.elpoint_privileged', 'off', true);
end;
$$;

revoke execute on function public.admin_restore_community(uuid) from public, anon;
grant execute on function public.admin_restore_community(uuid) to authenticated;
