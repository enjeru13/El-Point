-- Contact / support form. Messages land in a table for a future admin queue.

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email text,
  subject text not null check (char_length(subject) between 3 and 120),
  body text not null check (char_length(body) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists support_messages_status_idx
  on public.support_messages (status, created_at desc);

alter table public.support_messages enable row level security;

drop policy if exists "users file support messages" on public.support_messages;
create policy "users file support messages"
  on public.support_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.banned_at is not null
    )
  );

drop policy if exists "reporter or admin reads support messages" on public.support_messages;
create policy "reporter or admin reads support messages"
  on public.support_messages for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));

drop policy if exists "admin updates support messages" on public.support_messages;
create policy "admin updates support messages"
  on public.support_messages for update to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

grant select, insert on public.support_messages to authenticated;
grant update on public.support_messages to authenticated;
