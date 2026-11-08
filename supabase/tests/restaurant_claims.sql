-- Reclama tu local (migración 20261109020000).

create temp table _k as
select pg_temp.new_user('Admin K') as adm,
       pg_temp.new_user('Ana Dueña') as ana,
       pg_temp.new_user('Beto Otro') as beto,
       pg_temp.new_user('Caro Con Local', 'restaurant_owner') as caro,
       gen_random_uuid() as r1,
       gen_random_uuid() as r2,
       gen_random_uuid() as rcaro;
grant select on _k to anon, authenticated;

select set_config('app.elpoint_privileged', 'on', true);
update public.profiles set is_admin = true where id = (select adm from _k);
select set_config('app.elpoint_privileged', 'off', true);

insert into public.restaurants (id, name, status, owner_id) values
  ((select r1 from _k), 'Sin dueño Uno', 'approved', null),
  ((select r2 from _k), 'Sin dueño Dos', 'approved', null),
  ((select rcaro from _k), 'Local de Caro', 'approved', (select caro from _k));

-- submit_ok: cualquiera con cuenta puede pedir un local sin dueño.
select pg_temp.act_as((select ana from _k));
select public.submit_restaurant_claim((select r1 from _k), 'Ana Dueña', '+58 414 1234567', 'j-12345678-9',
  (select ana from _k)::text || '/claims/a.jpg');
select pg_temp.act_as((select beto from _k));
select public.submit_restaurant_claim((select r1 from _k), 'Beto Otro', '04241234567', null,
  (select beto from _k)::text || '/claims/b.jpg');
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select count(*) = 2 from public.restaurant_claims where restaurant_id = (select r1 from _k) and status = 'pending'),
  'submit_ok: dos solicitudes en revisión');
select pg_temp.ok(
  (select rif = 'J-12345678-9' from public.restaurant_claims where user_id = (select ana from _k)),
  'submit_ok: RIF en mayúsculas');
select pg_temp.ok(
  exists (select 1 from public.notifications where recipient_id = (select adm from _k) and data->>'kind' = 'claim'),
  'submit_ok: avisa a los admins');

-- submit_rules: segunda solicitud, local con dueño, dueño de otro local, foto ajena.
create temp table _errs (name text, ok boolean);
grant all on _errs to anon, authenticated;
create function pg_temp.expect_error(p_name text, p_sql text) returns void language plpgsql as $$
begin
  execute p_sql;
  insert into _errs values (p_name, false);
exception when raise_exception then
  insert into _errs values (p_name, true);
end $$;

select pg_temp.act_as((select ana from _k));
select pg_temp.expect_error('one_pending', format(
  'select public.submit_restaurant_claim(%L, ''Ana'', ''04141234567'', null, %L)',
  (select r2 from _k), (select ana from _k)::text || '/claims/c.jpg'));
select pg_temp.expect_error('has_owner', format(
  'select public.submit_restaurant_claim(%L, ''Ana'', ''04141234567'', null, %L)',
  (select rcaro from _k), (select ana from _k)::text || '/claims/c.jpg'));
select pg_temp.act_as((select caro from _k));
select pg_temp.expect_error('already_owner', format(
  'select public.submit_restaurant_claim(%L, ''Caro'', ''04141234567'', null, %L)',
  (select r2 from _k), (select caro from _k)::text || '/claims/c.jpg'));
select pg_temp.act_as((select beto from _k));
select pg_temp.expect_error('foreign_photo', format(
  'select public.submit_restaurant_claim(%L, ''Beto'', ''04141234567'', null, %L)',
  (select r2 from _k), (select ana from _k)::text || '/claims/a.jpg'));
select pg_temp.expect_error('not_admin_review', format(
  'select public.admin_review_claim(%L, true, null)',
  (select id from public.restaurant_claims where user_id = (select beto from _k))));
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select bool_and(ok) and count(*) = 5 from _errs),
  'submit_rules: ' || (select string_agg(name, ', ') from _errs where not ok));

-- read_own: cada quien ve solo sus solicitudes.
select pg_temp.act_as((select beto from _k));
select pg_temp.ok(
  (select count(*) = 1 from public.restaurant_claims),
  'read_own: solo la propia');
select pg_temp.as_admin_db();

-- approve: el local pasa a Ana con Original o prueba, Destacado y cuenta de dueño.
select pg_temp.act_as((select adm from _k));
select public.admin_review_claim(
  (select id from public.restaurant_claims where user_id = (select ana from _k)), true, null);
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select owner_id = (select ana from _k)
          and (founder_rank is not null or (paid_until > now() + interval '89 days' and plan_kind = 'trial'))
          and boost_until > now() + interval '13 days'
          and rif = 'J-12345678-9'
   from public.restaurants where id = (select r1 from _k)),
  'approve: dueño, plan y Destacado');
select pg_temp.ok(
  (select role = 'restaurant_owner' from public.profiles where id = (select ana from _k)),
  'approve: cuenta de dueño');
select pg_temp.ok(
  (select status = 'rejected' from public.restaurant_claims where user_id = (select beto from _k)),
  'approve: la otra solicitud queda rechazada');
select pg_temp.ok(
  exists (select 1 from public.notifications where recipient_id = (select beto from _k) and data->>'kind' = 'claim_rejected')
  and exists (select 1 from public.notifications where recipient_id = (select ana from _k) and data->>'kind' = 'claim_approved'),
  'approve: avisa a los dos');

-- reject: Beto pide el otro local y se le rechaza con motivo.
select pg_temp.act_as((select beto from _k));
select public.submit_restaurant_claim((select r2 from _k), 'Beto Otro', '04241234567', null,
  (select beto from _k)::text || '/claims/d.jpg');
select pg_temp.act_as((select adm from _k));
select public.admin_review_claim(
  (select id from public.restaurant_claims where user_id = (select beto from _k) and status = 'pending'),
  false, 'La foto no muestra el local');
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select owner_id is null from public.restaurants where id = (select r2 from _k))
  and exists (select 1 from public.restaurant_claims where user_id = (select beto from _k) and reason = 'La foto no muestra el local'),
  'reject: el local sigue sin dueño y queda el motivo');
select pg_temp.ok(
  (select role = 'customer' from public.profiles where id = (select beto from _k)),
  'reject: la cuenta no cambia');
