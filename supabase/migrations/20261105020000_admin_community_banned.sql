-- ═══════════════════════════════════════════════════════════════════════════
-- Comunidad: lista de locales sin permiso de publicar, para el panel admin.
--
-- community_banned_at y community_removals no están en los permisos de
-- columna de restaurants (20260919020000), así que el panel no puede leerlas
-- con un select normal. Esta función las entrega solo al admin. Para
-- devolver el permiso ya existe admin_restore_community (20261105010500).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.admin_community_banned()
returns table (
  restaurant_id uuid,
  name text,
  community_banned_at timestamptz,
  community_removals int
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
  select r.id, r.name, r.community_banned_at, r.community_removals
  from public.restaurants r
  where r.community_banned_at is not null or r.community_removals > 0
  order by r.community_banned_at desc nulls last, r.community_removals desc, r.name;
end;
$$;

revoke execute on function public.admin_community_banned() from public, anon;
grant execute on function public.admin_community_banned() to authenticated;
