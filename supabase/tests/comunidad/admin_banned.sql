-- Comunidad: lista de locales sin permiso (migración 20261105020000).

create temp table _b as
select pg_temp.new_user('Cliente B') as cli,
       pg_temp.new_user('Admin B') as adm,
       gen_random_uuid() as banned,
       gen_random_uuid() as warned,
       gen_random_uuid() as clean;
grant select on _b to authenticated;

insert into public.restaurants (id, name, status, is_active)
select banned, 'Local Vetado', 'approved', true from _b
union all select warned, 'Local Avisado', 'approved', true from _b
union all select clean, 'Local Limpio', 'approved', true from _b;

select set_config('app.elpoint_privileged', 'on', true);
update public.profiles set is_admin = true where id = (select adm from _b);
update public.restaurants set community_banned_at = now(), community_removals = 3 where id = (select banned from _b);
update public.restaurants set community_removals = 1 where id = (select warned from _b);
select set_config('app.elpoint_privileged', 'off', true);

-- lista_vetados: el vetado primero, el avisado después, el limpio no sale.
select pg_temp.act_as((select adm from _b));
create temp table _l as select * from public.admin_community_banned();
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select community_removals = 3 and community_banned_at is not null from _l where restaurant_id = (select banned from _b)),
  'lista_vetados: el vetado aparece con 3 retiros');
select pg_temp.ok(
  exists (select 1 from _l where restaurant_id = (select warned from _b) and community_banned_at is null),
  'lista_vetados: el avisado aparece sin veto');
select pg_temp.ok(
  not exists (select 1 from _l where restaurant_id = (select clean from _b)),
  'lista_vetados: el limpio no aparece');

-- no_admin_forbidden
do $$
begin
  perform pg_temp.act_as((select cli from _b));
  perform * from public.admin_community_banned();
  raise exception 'FAIL: un no admin vio la lista';
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  if sqlerrm <> 'forbidden' then raise exception 'FAIL: no_admin_forbidden (%)', sqlerrm; end if;
  raise notice 'ok: no_admin_forbidden';
end $$;
select pg_temp.as_admin_db();

drop table _b, _l;
