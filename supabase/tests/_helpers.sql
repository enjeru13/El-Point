-- Ayudantes para las pruebas SQL. Viven en pg_temp: desaparecen al cerrar
-- la sesión y, como todo corre dentro de begin … rollback, no queda nada.

-- Falla la prueba con un mensaje claro si la condición no se cumple.
create function pg_temp.ok(p_cond boolean, p_name text)
returns void language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'FAIL: %', p_name;
  end if;
  raise notice 'ok: %', p_name;
end;
$$;

-- Crea un usuario de prueba (auth.users + su perfil vía handle_new_user).
create function pg_temp.new_user(p_name text, p_role text default 'customer')
returns uuid language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (
    v_id,
    'test-' || v_id || '@elpoint.test',
    'authenticated',
    'authenticated',
    jsonb_build_object('full_name', p_name, 'role', p_role)
  );
  return v_id;
end;
$$;

-- Actúa como ese usuario (RLS y auth.uid()) hasta llamar a pg_temp.as_admin_db().
create function pg_temp.act_as(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Vuelve al rol de la conexión (postgres), sin RLS.
create function pg_temp.as_admin_db()
returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;
