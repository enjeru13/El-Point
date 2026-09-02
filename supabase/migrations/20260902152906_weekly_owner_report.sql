-- Weekly in-app digest for restaurant owners.
-- Delivery is an in-app notification row (no push infra yet); a pg_cron job
-- runs it every Monday. Owners who set notifWeekly = false are skipped.
--
-- Requires the pg_cron extension. On Supabase: Dashboard → Database →
-- Extensions → enable "pg_cron" once, then run `supabase db push`.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('like', 'reply', 'levelup', 'levelup_soon', 'promo', 'review', 'weekly'));

create or replace function public.send_weekly_owner_reports()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  cnt int;
  wk_avg numeric;
  body_txt text;
begin
  for r in
    select rest.id, rest.name, rest.owner_id, rest.rating_avg, rest.rating_count
    from public.restaurants rest
    join public.profiles p on p.id = rest.owner_id
    where rest.owner_id is not null
      and coalesce(p.settings->>'notifWeekly', 'true') <> 'false'
  loop
    select count(*), round(avg(rating)::numeric, 1)
      into cnt, wk_avg
    from public.reviews
    where restaurant_id = r.id
      and created_at >= now() - interval '7 days';

    if cnt = 0 then
      body_txt := 'Ninguna reseña nueva esta semana. Comparte tu local para recibir más.';
    else
      body_txt := cnt || (case when cnt = 1 then ' reseña nueva' else ' reseñas nuevas' end)
        || ' · promedio de la semana ' || coalesce(wk_avg::text, '–')
        || ' · calificación general ' || r.rating_avg;
    end if;

    insert into public.notifications (recipient_id, type, title, body, data)
    values (
      r.owner_id,
      'weekly',
      'Resumen semanal · ' || r.name,
      body_txt,
      jsonb_build_object('restaurant_id', r.id, 'week_reviews', cnt)
    );
  end loop;
end;
$$;

-- Schedule it (idempotent): drop any previous job with this name, re-add.
do $$
begin
  perform cron.unschedule('weekly-owner-reports')
  where exists (select 1 from cron.job where jobname = 'weekly-owner-reports');

  perform cron.schedule(
    'weekly-owner-reports',
    '0 13 * * 1',                       -- Mondays 13:00 UTC (~9:00 Venezuela)
    $cron$ select public.send_weekly_owner_reports(); $cron$
  );
exception
  when undefined_table or undefined_function or insufficient_privilege then
    raise notice 'pg_cron not available — enable the extension, then re-run this migration to schedule the job.';
end;
$$;
