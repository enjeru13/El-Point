-- Admin growth stats: one RPC the admin panel (web) calls instead of poking
-- at the Supabase dashboard's own charts. Weekly buckets of new users, new
-- restaurants and new reviews over the last N weeks.

create or replace function public.admin_growth_stats(p_weeks int default 12)
returns table (
  week_start date,
  new_users int,
  new_restaurants int,
  new_reviews int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  with weeks as (
    select generate_series(
      date_trunc('week', now())::date - ((greatest(p_weeks, 1) - 1) * 7),
      date_trunc('week', now())::date,
      interval '7 days'
    )::date as week_start
  )
  select
    w.week_start,
    (select count(*) from public.profiles p
       where date_trunc('week', p.created_at)::date = w.week_start)::int,
    (select count(*) from public.restaurants r
       where date_trunc('week', r.created_at)::date = w.week_start)::int,
    (select count(*) from public.reviews rv
       where date_trunc('week', rv.created_at)::date = w.week_start)::int
  from weeks w
  order by w.week_start;
end;
$$;

grant execute on function public.admin_growth_stats(int) to authenticated;
