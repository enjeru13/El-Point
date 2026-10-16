-- Menú con precios dentro de la app (función del plan) y plato del día.
--
--   * menu_items: platos de un local por sección, con precio base en USD.
--     Se lee solo si el local tiene plan (o eres el dueño/admin). Si el plan
--     vence, los platos quedan guardados pero ocultos; vuelven al renovar.
--   * restaurants.menu_currencies: en qué monedas se muestran los precios
--     (usd, bs, cop; cualquier combinación). La conversión la hace la app con
--     la tasa del día; aquí solo se guarda la preferencia del dueño.
--   * Plato del día: por defecto vence a medianoche (hora de Caracas). Si el
--     dueño elige "mantener" (special_keep), se queda hasta que lo quite.
--   * Avisos a quienes tienen el local en favoritos: cuando hay plato del día
--     y cuando se agota. Máximo uno de cada tipo por local y día.
--   * Tope de 100 platos por local.

-- ─── Preferencia de moneda ───────────────────────────────────────────────────
alter table public.restaurants
  add column if not exists menu_currencies text[] not null default array['usd'];

alter table public.restaurants
  drop constraint if exists restaurants_menu_currencies_valid;
alter table public.restaurants
  add constraint restaurants_menu_currencies_valid
  check (
    cardinality(menu_currencies) between 1 and 3
    and menu_currencies <@ array['usd', 'bs', 'cop']
  );

grant select (menu_currencies) on public.restaurants to anon, authenticated;

-- ─── Platos ──────────────────────────────────────────────────────────────────
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  section text not null default 'Platos'
    check (char_length(btrim(section)) between 1 and 40),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 200),
  price_usd numeric(8, 2) not null check (price_usd >= 0 and price_usd <= 9999),
  available boolean not null default true,
  is_daily_special boolean not null default false,
  special_keep boolean not null default false,
  special_date date,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menu_items_restaurant_idx
  on public.menu_items (restaurant_id, position);

alter table public.menu_items enable row level security;

drop policy if exists "menu visible with plan" on public.menu_items;
create policy "menu visible with plan"
  on public.menu_items for select
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and (
          (r.status = 'approved' and r.is_active and public.restaurant_has_plan(r.id))
          or r.owner_id = (select auth.uid())
          or public.is_admin((select auth.uid()))
        )
    )
  );

drop policy if exists "owner inserts menu items" on public.menu_items;
create policy "owner inserts menu items"
  on public.menu_items for insert to authenticated
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and r.owner_id = (select auth.uid())
        and public.restaurant_has_plan(r.id)
    )
  );

drop policy if exists "owner updates menu items" on public.menu_items;
create policy "owner updates menu items"
  on public.menu_items for update to authenticated
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and r.owner_id = (select auth.uid())
        and public.restaurant_has_plan(r.id)
    )
  );

drop policy if exists "owner deletes menu items" on public.menu_items;
create policy "owner deletes menu items"
  on public.menu_items for delete to authenticated
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = (select auth.uid())
    )
  );

grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;

-- ─── Reglas al escribir: tope, fecha del plato del día, updated_at ───────────
create or replace function public.menu_items_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Caracas')::date;
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.menu_items where restaurant_id = new.restaurant_id) >= 100 then
      raise exception 'menu_limit: máximo 100 platos por local';
    end if;
  else
    new.updated_at := now();
  end if;

  -- El plato del día sin "mantener" vale solo hasta la medianoche del día en
  -- que se marcó.
  if new.is_daily_special then
    if tg_op = 'INSERT' or new.special_date is null then
      new.special_date := v_today;
    elsif old.is_daily_special is not true or old.special_keep is distinct from new.special_keep then
      new.special_date := v_today;
    end if;
  else
    new.special_keep := false;
    new.special_date := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_menu_items_before_write on public.menu_items;
create trigger trg_menu_items_before_write
  before insert or update on public.menu_items
  for each row execute function public.menu_items_before_write();

-- ─── Avisos a favoritos: plato del día y plato agotado ───────────────────────
create or replace function public.notify_favoriters_on_menu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rest record;
  v_kind text;
  v_title text;
  v_body text;
  v_today date := (now() at time zone 'America/Caracas')::date;
  v_active boolean;
  v_became_special boolean;
  v_was_available boolean;
begin
  select r.id, r.name, r.status, r.is_active into v_rest
  from public.restaurants r where r.id = new.restaurant_id;

  if v_rest.id is null or v_rest.status <> 'approved' or not v_rest.is_active
     or not public.restaurant_has_plan(v_rest.id) then
    return null;
  end if;

  v_active := new.is_daily_special and (new.special_keep or new.special_date = v_today);
  if not v_active then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_became_special := true;
    v_was_available := false;
  else
    v_became_special := old.is_daily_special is not true or old.available is not true;
    v_was_available := old.available;
  end if;

  if new.available and v_became_special then
    v_kind := 'daily_special';
    v_title := 'Plato del día en ' || v_rest.name;
    v_body := left(new.name || ' · $' || trim(to_char(new.price_usd, 'FM9990.00')), 100);
  elsif not new.available and tg_op = 'UPDATE' and v_was_available then
    v_kind := 'sold_out';
    v_title := 'Se agotó el plato del día en ' || v_rest.name;
    v_body := left(new.name, 100);
  else
    return null;
  end if;

  -- Máximo un aviso de cada tipo por local y día.
  if exists (
    select 1 from public.notifications n
    where n.type = 'promo'
      and n.data ->> 'restaurant_id' = v_rest.id::text
      and n.data ->> 'kind' = v_kind
      and (n.created_at at time zone 'America/Caracas')::date = v_today
  ) then
    return null;
  end if;

  insert into public.notifications (recipient_id, type, title, body, data)
  select f.user_id, 'promo', v_title, v_body,
         jsonb_build_object('restaurant_id', v_rest.id, 'kind', v_kind)
  from public.favorites f
  where f.restaurant_id = v_rest.id;

  return null;
end;
$$;

drop trigger if exists trg_notify_favoriters_on_menu on public.menu_items;
create trigger trg_notify_favoriters_on_menu
  after insert or update on public.menu_items
  for each row execute function public.notify_favoriters_on_menu();
