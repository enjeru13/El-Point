-- Comparativa del dueño contra los locales de su categoría.
--
-- Privacidad: el dueño recibe solo agregados (cuántos locales se comparan,
-- la mediana y en qué punto queda), nunca cifras de un local concreto. Si hay
-- menos de 5 locales con actividad en la categoría no se devuelve ninguna
-- cifra de los demás, para que no se pueda deducir el número de uno solo.

create or replace function public.get_category_benchmark(
  p_restaurant_id uuid,
  p_days int default 30
)
returns table (
  peer_count int,
  my_views bigint,
  my_contacts bigint,
  median_views numeric,
  median_contacts numeric,
  pct_below_views int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 400));
  v_since timestamptz := now() - make_interval(days => v_days);
  v_min_peers constant int := 5;
begin
  if not exists (
    select 1 from public.restaurants r
    where r.id = p_restaurant_id and r.owner_id = auth.uid()
  ) and not public.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  with mine as (
    select rc.category_id
    from public.restaurant_categories rc
    where rc.restaurant_id = p_restaurant_id
  ),
  peers as (
    select distinct r.id
    from public.restaurants r
    join public.restaurant_categories rc on rc.restaurant_id = r.id
    where rc.category_id in (select category_id from mine)
      and r.id <> p_restaurant_id
      and r.status = 'approved'
      and r.is_active
  ),
  peer_counts as (
    select
      p.id,
      count(*) filter (where e.event_type = 'view') as views,
      count(*) filter (where e.event_type in ('whatsapp', 'call', 'instagram', 'order')) as contacts
    from peers p
    join public.restaurant_events e
      on e.restaurant_id = p.id and e.created_at >= v_since
    group by p.id
    having count(*) filter (where e.event_type = 'view') > 0
  ),
  me as (
    select
      count(*) filter (where e.event_type = 'view') as views,
      count(*) filter (where e.event_type in ('whatsapp', 'call', 'instagram', 'order')) as contacts
    from public.restaurant_events e
    where e.restaurant_id = p_restaurant_id and e.created_at >= v_since
  ),
  agg as (
    select
      count(*)::int as n,
      percentile_cont(0.5) within group (order by views) as med_views,
      percentile_cont(0.5) within group (order by contacts) as med_contacts
    from peer_counts
  )
  select
    agg.n,
    me.views,
    me.contacts,
    case when agg.n >= v_min_peers then round(agg.med_views::numeric, 1) end,
    case when agg.n >= v_min_peers then round(agg.med_contacts::numeric, 1) end,
    case when agg.n >= v_min_peers then
      round(100.0 * (select count(*) from peer_counts pc where pc.views < me.views) / agg.n)::int
    end
  from agg, me;
end;
$$;

revoke all on function public.get_category_benchmark(uuid, int) from public, anon;
grant execute on function public.get_category_benchmark(uuid, int) to authenticated;
