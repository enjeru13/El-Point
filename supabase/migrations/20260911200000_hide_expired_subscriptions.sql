-- Enforce the subscription: a non-founder restaurant whose paid_until has
-- lapsed drops out of public discovery (map/search/home/favorites/direct
-- link) — same as a paused (is_active=false) one already does. The owner
-- keeps full access to their own row regardless (edit, respond to reviews,
-- see their own status) via the existing owner_id branch; admins too.
--
-- One RLS change covers everywhere restaurants are read, because every
-- query — nearby_restaurants() (security invoker), search's plain select,
-- the embedded restaurant on reviews/favorites — goes through this same
-- policy. No application code needed: feed.ts/favorites already skip rows
-- where the embedded restaurant comes back null (RLS-blocked), which is
-- exactly what happens here.

drop policy if exists "active restaurants are viewable by everyone" on public.restaurants;
create policy "active restaurants are viewable by everyone"
  on public.restaurants for select
  using (
    (
      status = 'approved'
      and is_active
      and (founder_rank is not null or (paid_until is not null and paid_until > now()))
    )
    or owner_id = (select auth.uid())
    or public.is_admin((select auth.uid()))
  );
