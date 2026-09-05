-- Live notification bell: add `notifications` to the realtime publication so
-- clients can subscribe to postgres_changes (INSERT) filtered by
-- recipient_id, instead of only refreshing on remount/manual pull. RLS still
-- applies to the subscription (same "users read own notifications" policy).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
