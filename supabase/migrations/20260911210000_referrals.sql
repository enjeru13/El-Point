-- ═══════════════════════════════════════════════════════════════════════════
-- Referrals — invite a friend, both get an XP bonus once they're a real user
-- (their first review), not just for signing up (kills fake-account farming).
--
--   * profiles.referral_code: everyone's own short shareable code, generated
--     once at signup.
--   * profiles.referred_by: set at signup if they entered someone else's
--     code (passed as `invited_by_code` in auth signUp's user metadata,
--     same mechanism already used for full_name/username).
--   * Reward fires on the invitee's first review: +50 XP to the referrer,
--     +25 XP to the invitee. referral_reward_claimed stops it firing twice.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references public.profiles (id),
  add column if not exists referral_reward_claimed boolean not null default false;

comment on column public.profiles.referral_code is
  'Own shareable invite code — 6 chars, generated once at signup.';
comment on column public.profiles.referred_by is
  'Who invited this user, resolved at signup from invited_by_code in auth metadata. Never set after.';

revoke update (referral_code, referred_by, referral_reward_claimed) on public.profiles from anon, authenticated;

-- ─── Code generator: 6 chars, no 0/O/1/I/L — easy to read out loud ─────────
create or replace function public.generate_referral_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  tries int := 0;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, (floor(random() * length(chars)) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
    tries := tries + 1;
    if tries > 20 then
      raise exception 'could not generate a unique referral code';
    end if;
  end loop;
  return code;
end;
$$;

-- ─── handle_new_user: also generate own code + resolve who invited them ────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite_code text;
  v_referrer uuid;
begin
  v_invite_code := nullif(upper(btrim(new.raw_user_meta_data ->> 'invited_by_code')), '');

  if v_invite_code is not null then
    select id into v_referrer from public.profiles where referral_code = v_invite_code;
  end if;

  insert into public.profiles (id, role, full_name, avatar_url, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'customer'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    public.generate_referral_code(),
    v_referrer
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill: everyone who signed up before this migration has no code yet.
do $$
declare
  r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles set referral_code = public.generate_referral_code() where id = r.id;
  end loop;
end $$;

-- ─── Reward: invitee's first review pays out both sides ───────────────────
create or replace function public.award_referral_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer uuid;
  v_already boolean;
  v_review_count int;
begin
  select referred_by, referral_reward_claimed into v_referrer, v_already
  from public.profiles where id = new.author_id;

  if v_referrer is null or v_already then
    return null;
  end if;

  select count(*) into v_review_count from public.reviews
    where author_id = new.author_id and moderation <> 'removed';
  if v_review_count <> 1 then
    return null; -- not their first review
  end if;

  update public.profiles set referral_reward_claimed = true where id = new.author_id;
  perform public.award_xp(v_referrer, 50);
  perform public.award_xp(new.author_id, 25);

  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    v_referrer, 'streak',
    'Tu invitado dejó su primer rank: +50 XP',
    'Gracias por sumar gente nueva a El Point.',
    jsonb_build_object('kind', 'referral_reward')
  );
  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    new.author_id, 'streak',
    'Bono de bienvenida: +25 XP',
    'Por unirte con un código de invitación.',
    jsonb_build_object('kind', 'referral_reward')
  );
  return null;
end;
$$;

drop trigger if exists trg_award_referral_reward on public.reviews;
create trigger trg_award_referral_reward
  after insert on public.reviews
  for each row execute function public.award_referral_reward();

-- ─── How many people I've referred (for the invite screen) ────────────────
create or replace function public.my_referral_count()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.profiles where referred_by = auth.uid();
$$;

grant execute on function public.my_referral_count() to authenticated;
