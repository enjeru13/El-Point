-- Métodos de pago que ofrece cada local. Mismo patrón que amenities:
-- catálogo de referencia + tabla N:M + RPC atómico para que el dueño
-- reemplace su conjunto completo.

create table if not exists public.payment_methods (
  id smallint primary key,
  slug text not null unique,
  label text not null,
  icon text not null,
  sort_order smallint not null default 0
);

alter table public.payment_methods enable row level security;

drop policy if exists "payment_methods are viewable by everyone" on public.payment_methods;
create policy "payment_methods are viewable by everyone"
  on public.payment_methods for select
  using (true);

insert into public.payment_methods (id, slug, label, icon, sort_order) values
  (1, 'cash_bs',    'Efectivo (Bs)',          'mdi:cash',                   1),
  (2, 'cash_usd',   'Efectivo (USD)',         'mdi:currency-usd',           2),
  (3, 'cash_cop',   'Efectivo (COP)',         'mdi:cash-multiple',          3),
  (4, 'pago_movil', 'Pago móvil',             'mdi:cellphone-check',        4),
  (5, 'zelle',      'Zelle',                  'mdi:alpha-z-circle-outline', 5),
  (6, 'card',       'Tarjeta (punto de venta)', 'mdi:credit-card',          6),
  (7, 'transfer',   'Transferencia',          'mdi:bank-transfer',          7),
  (8, 'crypto',     'Binance / cripto',       'mdi:bitcoin',                8)
on conflict (id) do update
  set slug = excluded.slug,
      label = excluded.label,
      icon = excluded.icon,
      sort_order = excluded.sort_order;

grant select on public.payment_methods to anon, authenticated;

create table if not exists public.restaurant_payment_methods (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  payment_method_id smallint not null references public.payment_methods (id) on delete cascade,
  primary key (restaurant_id, payment_method_id)
);

create index if not exists restaurant_payment_methods_method_idx
  on public.restaurant_payment_methods (payment_method_id);

alter table public.restaurant_payment_methods enable row level security;

drop policy if exists "restaurant_payment_methods viewable by everyone" on public.restaurant_payment_methods;
create policy "restaurant_payment_methods viewable by everyone"
  on public.restaurant_payment_methods for select
  using (true);

drop policy if exists "owners manage own restaurant payment methods (insert)" on public.restaurant_payment_methods;
create policy "owners manage own restaurant payment methods (insert)"
  on public.restaurant_payment_methods for insert to authenticated
  with check (exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id and r.owner_id = (select auth.uid())
  ));

drop policy if exists "owners manage own restaurant payment methods (delete)" on public.restaurant_payment_methods;
create policy "owners manage own restaurant payment methods (delete)"
  on public.restaurant_payment_methods for delete to authenticated
  using (exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id and r.owner_id = (select auth.uid())
  ));

grant select on public.restaurant_payment_methods to anon, authenticated;
grant insert, delete on public.restaurant_payment_methods to authenticated;

-- Reemplazo atómico del conjunto completo de métodos de pago de un local.
create or replace function public.set_restaurant_payment_methods(
  p_restaurant_id uuid,
  p_method_ids smallint[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.restaurants
    where id = p_restaurant_id and owner_id = uid
  ) then
    raise exception 'not your restaurant';
  end if;

  delete from public.restaurant_payment_methods
  where restaurant_id = p_restaurant_id
    and (p_method_ids is null or payment_method_id <> all (p_method_ids));

  insert into public.restaurant_payment_methods (restaurant_id, payment_method_id)
  select p_restaurant_id, m
  from unnest(coalesce(p_method_ids, '{}')) as m
  on conflict do nothing;
end;
$$;

revoke execute on function public.set_restaurant_payment_methods(uuid, smallint[]) from public, anon;
grant execute on function public.set_restaurant_payment_methods(uuid, smallint[]) to authenticated;
