-- Native push: every notifications row is mirrored to the recipient's device
-- via Expo's push service. Requires the pg_net extension (async HTTP from
-- Postgres) — enable it once in Dashboard → Database → Extensions if needed.

create extension if not exists pg_net;

alter table public.profiles
  add column if not exists push_token text;

-- The device registers/refreshes its own token; nothing else may touch it.
-- (RLS already lets a user update their own profile row; push_token isn't in
-- the guarded-columns list, so this is allowed.)

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
    when 'promo'   then 'notifPromos'
    when 'weekly'  then 'notifWeekly'
    else null            -- 'moderation' and anything else: always push
  end;
$$;

create or replace function public.send_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_settings jsonb;
  v_key text;
begin
  select push_token, settings
    into v_token, v_settings
  from public.profiles
  where id = new.recipient_id;

  if v_token is null or v_token = '' then
    return null;
  end if;

  -- Respect the recipient's per-type toggle (can't un-show a system banner
  -- after the fact, so filter here — same keys the app uses client-side).
  v_key := public.push_setting_key(new.type);
  if v_key is not null
     and coalesce(v_settings ->> v_key, 'true') = 'false' then
    return null;
  end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Accept', 'application/json'
    ),
    body := jsonb_build_object(
      'to', v_token,
      'title', new.title,
      'body', coalesce(new.body, ''),
      'sound', 'default',
      'data', coalesce(new.data, '{}'::jsonb) || jsonb_build_object('notification_id', new.id)
    )
  );
  return null;
end;
$$;

drop trigger if exists trg_send_push_on_notification on public.notifications;
create trigger trg_send_push_on_notification
  after insert on public.notifications
  for each row execute function public.send_push_on_notification();
