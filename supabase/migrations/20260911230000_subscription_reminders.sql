-- Avisos de suscripción para dueños no-Originales: 7/3/1 días antes de
-- vencer y el día que se oculta del mapa. Mismo patrón que
-- send_weekly_owner_reports() (in-app notification + pg_cron diario).
-- Siempre se envían (no respetan ningún toggle de Ajustes) porque son
-- avisos de negocio, no ruido social — mismo trato que 'moderation'.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'like', 'reply', 'levelup', 'levelup_soon', 'promo', 'review', 'weekly',
    'moderation', 'mission', 'streak', 'sub_expiring', 'sub_expired'
  ));

create or replace function public.push_setting_key(p_type text)
returns text
language sql
immutable
as $$
  select case p_type
    when 'like'    then 'notifRanks'
    when 'reply'   then 'notifReplies'
    when 'review'  then 'notifReviews'
    when 'levelup' then 'notifLevelup'
    when 'mission' then 'notifLevelup'
    when 'streak'  then 'notifLevelup'
    when 'promo'   then 'notifPromos'
    when 'weekly'  then 'notifWeekly'
    else null            -- 'moderation', 'sub_expiring', 'sub_expired' y cualquier otro: siempre push
  end;
$$;

create or replace function public.send_subscription_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_days int;
begin
  for r in
    select rest.id, rest.name, rest.owner_id, rest.paid_until
    from public.restaurants rest
    where rest.status = 'approved'
      and rest.founder_rank is null
      and rest.paid_until is not null
      and rest.owner_id is not null
  loop
    v_days := (r.paid_until::date - (now())::date);

    if v_days in (7, 3, 1) then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        r.owner_id,
        'sub_expiring',
        'Tu suscripción vence en ' || v_days || (case when v_days = 1 then ' día' else ' días' end) || ' · ' || r.name,
        'Paga a tiempo para que tu local no deje de aparecer en el mapa.',
        jsonb_build_object('restaurant_id', r.id, 'kind', 'subscription', 'days_left', v_days)
      );
    elsif v_days = 0 then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        r.owner_id,
        'sub_expiring',
        'Tu suscripción vence hoy · ' || r.name,
        'Si no pagas hoy, tu local deja de salir en el mapa mañana.',
        jsonb_build_object('restaurant_id', r.id, 'kind', 'subscription', 'days_left', 0)
      );
    elsif v_days = -1 then
      insert into public.notifications (recipient_id, type, title, body, data)
      values (
        r.owner_id,
        'sub_expired',
        'Tu local ya no aparece en el mapa · ' || r.name,
        'Tu suscripción venció. Paga para reactivarlo — tu cuenta sigue funcionando con normalidad.',
        jsonb_build_object('restaurant_id', r.id, 'kind', 'subscription')
      );
    end if;
  end loop;
end;
$$;

do $$
begin
  perform cron.unschedule('subscription-reminders')
  where exists (select 1 from cron.job where jobname = 'subscription-reminders');

  perform cron.schedule(
    'subscription-reminders',
    '0 13 * * *',                       -- diario, 13:00 UTC (~9:00 Venezuela)
    $cron$ select public.send_subscription_reminders(); $cron$
  );
exception
  when undefined_table or undefined_function or insufficient_privilege then
    raise notice 'pg_cron not available — enable the extension, then re-run this migration to schedule the job.';
end;
$$;
