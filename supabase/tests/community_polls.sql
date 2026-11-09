-- Encuestas (migración 20261111020000).

create temp table _p as
select pg_temp.new_user('Autora P') as a,
       pg_temp.new_user('Votante P') as b,
       pg_temp.new_user('Mirona P') as c,
       gen_random_uuid() as p1,
       gen_random_uuid() as rid;
grant select on _p to anon, authenticated;

insert into public.restaurants (id, name, status, location)
values ((select rid from _p), 'Local Encuesta P', 'approved', st_point(-71.50000, 8.50000)::geography);
insert into public.posts (id, author_id, topic, body, client_id)
values ((select p1 from _p), (select a from _p), 'recomiendame', '¿Dónde comemos?', gen_random_uuid());

-- encuesta_reglas
select pg_temp.act_as((select b from _p));
do $$ begin
  perform public.create_poll((select p1 from _p), 1, '[{"label":"A"},{"label":"B"}]');
  raise exception 'FAIL: otra persona crea';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end $$;
select pg_temp.act_as((select a from _p));
do $$ begin
  perform public.create_poll((select p1 from _p), 1, '[{"label":"A"}]');
  raise exception 'FAIL: 1 opción';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end $$;
do $$ begin
  perform public.create_poll((select p1 from _p), 1, '[{"label":"A"},{"label":"B"},{"label":"C"},{"label":"D"},{"label":"E"}]');
  raise exception 'FAIL: 5 opciones';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end $$;
do $$ begin
  perform public.create_poll((select p1 from _p), 2, '[{"label":"A"},{"label":"B"}]');
  raise exception 'FAIL: 2 días';
exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end $$;
select pg_temp.ok(true, 'encuesta_reglas');

-- crear_encuesta_valida
select public.create_poll((select p1 from _p), 1,
  jsonb_build_array(jsonb_build_object('label', 'Pizza'), jsonb_build_object('label', 'Arepa'),
                    jsonb_build_object('restaurant_id', (select rid from _p))));
select pg_temp.ok(jsonb_array_length(public.poll_state((select p1 from _p)) -> 'options') = 3, 'crear_encuesta_valida');

-- resultados_ocultos
select pg_temp.act_as((select c from _p));
select pg_temp.ok(
  (select bool_and(o -> 'votes' = 'null'::jsonb) from jsonb_array_elements(public.poll_state((select p1 from _p)) -> 'options') o),
  'resultados_ocultos: sin votar no ve votos');

-- voto_cambia_y_cerrada
select pg_temp.act_as((select b from _p));
select public.vote_poll((select p1 from _p), (select id from public.post_poll_options where post_id = (select p1 from _p) and position = 1));
select public.vote_poll((select p1 from _p), (select id from public.post_poll_options where post_id = (select p1 from _p) and position = 2));
select pg_temp.ok(
  (select (s ->> 'total')::int = 1
      and s ->> 'my_option' = (select id::text from public.post_poll_options where post_id = (select p1 from _p) and position = 2)
   from (select public.poll_state((select p1 from _p)) as s) x),
  'voto_cambia: un solo voto, el último');
select pg_temp.as_admin_db();
select pg_temp.ok(
  (select count(*) = 1 from public.community_xp_log where user_id = (select b from _p) and reason = 'poll_vote' and not reverted),
  'voto_cambia: XP una sola vez');
update public.post_polls set closes_at = now() - interval '1 minute' where post_id = (select p1 from _p);
select pg_temp.act_as((select b from _p));
do $$ begin
  perform public.vote_poll((select p1 from _p), (select id from public.post_poll_options where post_id = (select p1 from _p) and position = 1));
  raise exception 'FAIL: votó cerrada';
exception when raise_exception then if sqlerrm like 'FAIL%' or sqlerrm <> 'poll_closed' then raise; end if; end $$;
select pg_temp.ok(true, 'voto_cerrada: poll_closed');

-- cierre_avisa
select pg_temp.as_admin_db();
select public.close_due_polls();
select pg_temp.ok(
  (select count(*) = 1 from public.notifications
   where recipient_id = (select a from _p) and type = 'poll_ended' and title like '%Arepa%' and title like '%100%%'),
  'cierre_avisa: gana Arepa 100%');
select public.close_due_polls();
select pg_temp.ok(
  (select count(*) = 1 from public.notifications where recipient_id = (select a from _p) and type = 'poll_ended'),
  'cierre_avisa: no repite');
