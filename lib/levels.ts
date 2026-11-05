// Curva de niveles: igual que public.xp_for_level / public.level_for_xp en
// la base de datos (migración 20261105000000_level_curve_smoother.sql).
// Si cambias una, cambia la otra: tienen que dar exactamente lo mismo.
//
//   xpForLevel(L) = round(50 × (L − 1)^1,5)
//   levelForXp(xp) = el mayor L con xpForLevel(L) <= xp (mínimo 1)

const MAX_LEVEL = 1000;

export function xpForLevel(level: number): number {
  return Math.round(50 * Math.pow(Math.max(1, level) - 1, 1.5));
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= xp) level++;
  return level;
}
