-- Comunidad: locales que publican y moderación (migraciones 20261105010200 y 010300).

create temp table _m as
select pg_temp.new_user('Ana') as a,
       pg_temp.new_user('R1') as r1,
       pg_temp.new_user('R2') as r2,
       pg_temp.new_user('R3') as r3,
       pg_temp.new_user('Admin') as adm,
       pg_temp.new_user('Dueño', 'restaurant_owner') as o,
       pg_temp.new_user('Dueño sin plan', 'restaurant_owner') as o2,
       (select id from public.categories order by id limit 1) as cat,
       gen_random_uuid() as resto,
       gen_random_uuid() as resto2;
grant select on _m to authenticated;

-- Dos locales aprobados: uno con plan pagado al día, otro vencido.
insert into public.restaurants (id, owner_id, name, status, is_active)
select resto, o, 'Local Con Plan', 'approved', true from _m
union all
select resto2, o2, 'Local Sin Plan', 'approved', true from _m;

select set_config('app.elpoint_privileged', 'on', true);
update public.restaurants set founder_rank = null, paid_until = now() + interval '30 days'
  where id = (select resto from _m);
update public.restaurants set founder_rank = null, paid_until = now() - interval '1 day'
  where id = (select resto2 from _m);
update public.profiles set is_admin = true where id = (select adm from _m);
select set_config('app.elpoint_privileged', 'off', true);

create function pg_temp.xp(p uuid) returns int language sql as
  $$ select xp from public.profiles where id = p $$;

create function pg_temp.owner_post(p_user uuid, p_resto uuid) returns uuid language plpgsql as $$
declare v uuid;
begin
  perform pg_temp.act_as(p_user);
  v := public.create_post(gen_random_uuid(), 'antojos', 'novedad', null, null, null, '{}', p_resto);
  perform pg_temp.as_admin_db();
  return v;
end $$;

create function pg_temp.post_as(p_user uuid, p_resto uuid default null, p_cat smallint default null)
returns uuid language plpgsql as $$
declare v uuid;
begin
  perform pg_temp.act_as(p_user);
  v := public.create_post(gen_random_uuid(), 'recomiendame', 'post', p_resto, null, null,
    case when p_cat is null then '{}'::smallint[] else array[p_cat] end);
  perform pg_temp.as_admin_db();
  return v;
end $$;

create function pg_temp.report_as(p_user uuid, p_post uuid) returns void language plpgsql as $$
begin
  perform pg_temp.act_as(p_user);
  insert into public.post_reports (post_id, reporter_id, reason) values (p_post, p_user, 'spam');
  perform pg_temp.as_admin_db();
end $$;

create function pg_temp.moderate_as(p_user uuid, p_post uuid, p_status text) returns void language plpgsql as $$
begin
  perform pg_temp.act_as(p_user);
  update public.posts set moderation = p_status where id = p_post;
  perform pg_temp.as_admin_db();
end $$;

create function pg_temp.fails_with(p_sql text, p_code text, p_name text)
returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FAIL: % (no falló)', p_name;
exception when others then
  perform pg_temp.as_admin_db();
  if sqlerrm like 'FAIL:%' then raise; end if;
  if sqlerrm <> p_code then
    raise exception 'FAIL: % (falló con "%", se esperaba "%")', p_name, sqlerrm, p_code;
  end if;
  raise notice 'ok: %', p_name;
end $$;

-- owner_post_ok
create temp table _o as select pg_temp.xp((select o from _m)) as xp0;
create temp table _op as select pg_temp.owner_post((select o from _m), (select resto from _m)) as id;
select pg_temp.ok(
  (select topic = 'novedades' and restaurant_id = (select resto from _m) and as_restaurant_id = (select resto from _m)
   from public.posts where id = (select id from _op)),
  'owner_post_ok: novedades con su local');
select pg_temp.ok(pg_temp.xp((select o from _m)) = (select xp0 from _o), 'owner_post_ok: el local no suma XP');

-- owner_post_rate_limited / owner_no_plan / owner_not_allowed
select pg_temp.fails_with(format('select pg_temp.owner_post(%L, %L)', (select o from _m), (select resto from _m)),
  'owner_post_rate_limited', 'owner_post_rate_limited');
select pg_temp.fails_with(format('select pg_temp.owner_post(%L, %L)', (select o2 from _m), (select resto2 from _m)),
  'owner_no_plan', 'owner_post_requires_plan');
select pg_temp.fails_with(format('select pg_temp.owner_post(%L, %L)', (select a from _m), (select resto from _m)),
  'owner_not_allowed', 'solo el dueño publica como su local');

-- kill_switch
update public.app_settings set owner_posts_enabled = false where id;
delete from public.posts where id = (select id from _op);
select pg_temp.fails_with(format('select pg_temp.owner_post(%L, %L)', (select o from _m), (select resto from _m)),
  'owner_posts_disabled', 'kill_switch');
update public.app_settings set owner_posts_enabled = true where id;

-- owner_post_banned
select set_config('app.elpoint_privileged', 'on', true);
update public.restaurants set community_banned_at = now() where id = (select resto from _m);
select set_config('app.elpoint_privileged', 'off', true);
select pg_temp.fails_with(format('select pg_temp.owner_post(%L, %L)', (select o from _m), (select resto from _m)),
  'owner_banned', 'owner_post_banned');
select set_config('app.elpoint_privileged', 'on', true);
update public.restaurants set community_banned_at = null where id = (select resto from _m);
select set_config('app.elpoint_privileged', 'off', true);

-- owner_reply_only_mentions
create temp table _sin as select pg_temp.post_as((select a from _m), null, (select cat from _m)) as id;
create temp table _con as select pg_temp.post_as((select a from _m), (select resto from _m)) as id;
grant select on _sin, _con to authenticated;
select pg_temp.fails_with(
  format($f$select pg_temp.act_as(%L); insert into public.post_replies (post_id, author_id, as_restaurant_id, body) values (%L, %L, %L, 'hola')$f$,
    (select o from _m), (select id from _sin), (select o from _m), (select resto from _m)),
  'owner_reply_not_mentioned', 'owner_reply_only_mentions');
select pg_temp.act_as((select o from _m));
insert into public.post_replies (post_id, author_id, as_restaurant_id, body)
select id, (select o from _m), (select resto from _m), 'gracias' from _con;
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select reply_count from public.posts where id = (select id from _con)) = 1,
  'el local responde donde lo mencionan');

-- reporte_del_dueno_no_basta + tres_reportes_ocultan
select pg_temp.report_as((select o from _m), (select id from _con));
select pg_temp.report_as((select r1 from _m), (select id from _con));
select pg_temp.ok((select moderation from public.posts where id = (select id from _con)) = 'visible',
  'reporte_del_dueno_no_basta (2 reportes, sigue visible)');
select pg_temp.report_as((select r2 from _m), (select id from _con));
select pg_temp.ok((select moderation from public.posts where id = (select id from _con)) = 'hidden',
  'tres_reportes_ocultan');

-- usuario_no_cambia_moderacion
select pg_temp.moderate_as((select a from _m), (select id from _con), 'visible');
select pg_temp.ok((select moderation from public.posts where id = (select id from _con)) = 'hidden',
  'usuario_no_cambia_moderacion');

-- removed_strike_y_descuento: el XP que dio el post a Ana se descuenta.
create temp table _s as
select strikes as s0, xp as xp0,
       (select coalesce(sum(amount), 0) from public.community_xp_log
        where post_id = (select id from _con) and user_id = (select a from _m) and not reverted) as earned
from public.profiles where id = (select a from _m);
select pg_temp.moderate_as((select adm from _m), (select id from _con), 'removed');
select pg_temp.ok(
  (select strikes from public.profiles where id = (select a from _m)) = (select s0 from _s) + 1,
  'removed suma strike');
select pg_temp.ok(
  pg_temp.xp((select a from _m)) = (select xp0 - earned from _s),
  'removed descuenta el XP del post');

-- tres_removidos_vetan_local (sin strike personal del dueño)
create temp table _ds as select strikes as s0 from public.profiles where id = (select o from _m);
do $$
declare i int; v uuid;
begin
  for i in 1..3 loop
    -- Un post nuevo por vuelta: se salta el límite de 24 h borrando el anterior.
    delete from public.posts where as_restaurant_id = (select resto from _m);
    v := pg_temp.owner_post((select o from _m), (select resto from _m));
    perform pg_temp.moderate_as((select adm from _m), v, 'removed');
  end loop;
end $$;
select pg_temp.ok(
  (select community_banned_at is not null from public.restaurants where id = (select resto from _m)),
  'tres_removidos_vetan_local');
select pg_temp.ok(
  (select strikes from public.profiles where id = (select o from _m)) = (select s0 from _ds),
  'el dueño no recibe strike personal');

drop table _m, _o, _op, _sin, _con, _s, _ds;
