-- Curva de niveles 50 × (L − 1)^1,5 (migración 20261105000000).

select pg_temp.ok(public.xp_for_level(1) = 0, 'xp_for_level(1) = 0');
select pg_temp.ok(public.xp_for_level(4) = 260, 'xp_for_level(4) = 260');
select pg_temp.ok(public.xp_for_level(9) = 1131, 'xp_for_level(9) = 1131');
select pg_temp.ok(public.xp_for_level(16) = 2905, 'xp_for_level(16) = 2905');
select pg_temp.ok(public.xp_for_level(25) = 5879, 'xp_for_level(25) = 5879');
select pg_temp.ok(public.xp_for_level(35) = 9913, 'xp_for_level(35) = 9913');

select pg_temp.ok(public.level_for_xp(0) = 1, 'level_for_xp(0) = 1');
select pg_temp.ok(public.level_for_xp(-5) = 1, 'level_for_xp(-5) = 1');
select pg_temp.ok(public.level_for_xp(259) = 3, 'level_for_xp(259) = 3');
select pg_temp.ok(public.level_for_xp(260) = 4, 'level_for_xp(260) = 4');
select pg_temp.ok(public.level_for_xp(9912) = 34, 'level_for_xp(9912) = 34');
select pg_temp.ok(public.level_for_xp(9913) = 35, 'level_for_xp(9913) = 35');

select pg_temp.ok(
  (select bool_and(public.level_for_xp(public.xp_for_level(l)) = l) from generate_series(1, 60) l),
  'nivel_y_xp_son_inversos_hasta_60'
);

select pg_temp.ok(
  not exists (select 1 from public.profiles where level <> public.level_for_xp(xp)),
  'nivel_recalculado'
);

-- La migración no pasa por award_xp, así que no crea avisos de nivel.
select pg_temp.ok(
  not exists (
    select 1 from public.notifications
    where type = 'levelup' and created_at >= transaction_timestamp()
  ),
  'levelup_no_notifica_al_recalcular'
);
