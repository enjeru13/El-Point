-- Moneda base y tasas propias del menú.
--
-- Cada local decide en qué moneda ESCRIBE sus precios (menu_base_currency) y
-- con qué tasa se calculan las demás. Si no pone tasa propia, la app usa la del
-- BCV para bolívares y la del día para pesos; si la pone, usa la suya y el
-- comensal ve "tasas del local".
--
--   menu_base_currency  usd | bs | cop. En esa moneda está guardado el precio.
--   menu_bs_rate        Bs por dólar propios; null = BCV automático.
--   menu_cop_rate       COP por dólar propios; null = tasa automática del día.
--
-- Por eso menu_items.price_usd pasa a llamarse price: ya no es siempre dólares.
-- Los precios que ya existen siguen siendo los mismos números (eran dólares y
-- la base por defecto es usd).

alter table public.restaurants
  add column if not exists menu_base_currency text not null default 'usd',
  add column if not exists menu_bs_rate numeric(14, 4),
  add column if not exists menu_cop_rate numeric(14, 4);

alter table public.restaurants
  drop constraint if exists restaurants_menu_base_currency_valid;
alter table public.restaurants
  add constraint restaurants_menu_base_currency_valid
  check (menu_base_currency in ('usd', 'bs', 'cop'));

alter table public.restaurants
  drop constraint if exists restaurants_menu_rates_valid;
alter table public.restaurants
  add constraint restaurants_menu_rates_valid
  check (
    (menu_bs_rate is null or (menu_bs_rate > 0 and menu_bs_rate <= 10000000))
    and (menu_cop_rate is null or (menu_cop_rate > 0 and menu_cop_rate <= 10000000))
  );

grant select (menu_base_currency, menu_bs_rate, menu_cop_rate) on public.restaurants to anon, authenticated;

-- ─── Precio en la moneda base ────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'menu_items' and column_name = 'price_usd'
  ) then
    alter table public.menu_items rename column price_usd to price;
  end if;
end $$;

alter table public.menu_items drop constraint if exists menu_items_price_usd_check;
alter table public.menu_items drop constraint if exists menu_items_price_check;
alter table public.menu_items alter column price type numeric(14, 2);
alter table public.menu_items
  add constraint menu_items_price_check check (price >= 0 and price <= 99999999);

-- ─── Aviso de plato del día: ahora con el símbolo de la moneda base ──────────
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
  v_symbol text;
begin
  select r.id, r.name, r.status, r.is_active, r.menu_base_currency into v_rest
  from public.restaurants r where r.id = new.restaurant_id;

  if v_rest.id is null or v_rest.status <> 'approved' or not v_rest.is_active
     or not public.restaurant_has_plan(v_rest.id) then
    return null;
  end if;

  v_active := new.is_daily_special and (new.special_keep or new.special_date = v_today);
  if not v_active then
    return null;
  end if;

  v_symbol := case v_rest.menu_base_currency when 'bs' then 'Bs ' when 'cop' then 'COP ' else '$' end;

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
    v_body := left(new.name || ' · ' || v_symbol || trim(to_char(new.price, 'FM9999999990.00')), 100);
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
