-- Fix: the column guards froze protected columns for EVERY caller that didn't
-- set the app.elpoint_privileged GUC — including a superuser running plain SQL
-- in the dashboard. That made "update profiles set is_admin = true" a silent
-- no-op.
--
-- Add an escape hatch: a direct SQL / service-role session (current_user is
-- postgres / service_role / supabase_admin) is always trusted. PostgREST calls
-- from the app run as role "authenticated" and stay guarded.

create or replace function public.is_trusted_writer()
returns boolean
language sql
stable
as $$
  select current_user in ('postgres', 'service_role', 'supabase_admin', 'supabase_auth_admin')
      or coalesce(current_setting('app.elpoint_privileged', true), 'off') = 'on';
$$;

create or replace function public.guard_protected_profile_cols()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  new.is_admin  := old.is_admin;
  new.strikes   := old.strikes;
  new.banned_at := old.banned_at;
  return new;
end;
$$;

create or replace function public.guard_review_moderation_cols()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  if (new.moderation is distinct from old.moderation
      or new.moderated_at is distinct from old.moderated_at)
     and not public.is_admin((select auth.uid())) then
    new.moderation   := old.moderation;
    new.moderated_at := old.moderated_at;
  end if;
  return new;
end;
$$;

create or replace function public.guard_restaurant_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_trusted_writer() or public.is_admin((select auth.uid())) then
    return new;
  end if;

  if old.status = 'approved'
     and (new.name is distinct from old.name
          or new.address is distinct from old.address) then
    new.status := 'pending';
    new.status_reason := null;
    new.submitted_at := now();
    new.reviewed_at := null;
    return new;
  end if;

  new.status := old.status;
  new.status_reason := old.status_reason;
  new.submitted_at := old.submitted_at;
  new.reviewed_at := old.reviewed_at;
  return new;
end;
$$;
