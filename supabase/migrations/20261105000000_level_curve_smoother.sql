-- Curva de niveles más suave: XP para el nivel L = round(50 × (L − 1)^1,5).
-- Antes era 50 × (L − 1)² y Leyenda (nivel 35) pedía 57.800 XP; ahora 9.913.
-- Espejo en la app: lib/levels.ts. Las dos tienen que dar lo mismo.

create or replace function public.xp_for_level(p_level int)
returns int
language sql
immutable
as $$
  select round((50 * power(greatest(p_level, 1) - 1, 1.5))::numeric)::int;
$$;

-- El mayor nivel cuyo umbral ya se alcanzó (mínimo 1, máximo 1000).
create or replace function public.level_for_xp(p_xp int)
returns int
language sql
immutable
as $$
  select coalesce(max(l), 1)
  from generate_series(1, 1000) as l
  where public.xp_for_level(l) <= greatest(p_xp, 0);
$$;

-- Recalcular a todos. Con la curva nueva el nivel solo puede subir. Se hace
-- con un update directo (no con award_xp) para que no salgan avisos de
-- "¡Subiste de nivel!" en masa.
update public.profiles
  set level = public.level_for_xp(xp)
  where level <> public.level_for_xp(xp);
