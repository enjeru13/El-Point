-- Bloquear usuarios: quien bloquea deja de ver las reseñas de la otra persona.
-- Cada usuario solo ve y cambia sus propios bloqueos.

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

drop policy if exists "users read own blocks" on public.user_blocks;
create policy "users read own blocks"
  on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

drop policy if exists "users block others" on public.user_blocks;
create policy "users block others"
  on public.user_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));

drop policy if exists "users unblock" on public.user_blocks;
create policy "users unblock"
  on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

revoke all on public.user_blocks from anon;
grant select, insert, delete on public.user_blocks to authenticated;
