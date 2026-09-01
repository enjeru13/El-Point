-- Quadratic XP curve + named ranks.
--   xp to reach level L (L>=1) = 50 * (L-1)^2
--   level for xp = floor(sqrt(xp / 50)) + 1

create or replace function public.xp_for_level(p_level int)
returns int
language sql
immutable
as $$
  select (50 * (greatest(p_level, 1) - 1) ^ 2)::int;
$$;

create or replace function public.level_for_xp(p_xp int)
returns int
language sql
immutable
as $$
  select greatest(1, floor(sqrt(greatest(p_xp, 0)::float / 50))::int + 1);
$$;

create or replace function public.rank_for_level(p_level int)
returns text
language sql
immutable
as $$
  select case
    when p_level <= 3  then 'Novato'
    when p_level <= 8  then 'Comensal'
    when p_level <= 15 then 'Explorador'
    when p_level <= 24 then 'Crítico Local'
    when p_level <= 34 then 'Gurú Gastronómico'
    else 'Leyenda'
  end;
$$;

-- award_xp now uses the quadratic curve.
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
    if new_level > old_level then
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

grant execute on function public.xp_for_level(int)   to anon, authenticated;
grant execute on function public.level_for_xp(int)   to anon, authenticated;
grant execute on function public.rank_for_level(int) to anon, authenticated;

-- Recompute every profile's level under the new curve.
update public.profiles set level = public.level_for_xp(xp);
