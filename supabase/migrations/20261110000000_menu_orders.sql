-- Pedido armado por WhatsApp desde el menú.
--
--   * menu_bs_rate_updated_at / menu_cop_rate_updated_at: cuándo cambió la
--     tasa propia del local. El comensal ve "actualizada hace N días" y un
--     aviso si pasa de 7. Null cuando la tasa es automática (BCV / del día).
--   * delivery_fee_mode / delivery_fee: costo del delivery que el dueño
--     configura en Pedidos. 'fixed' suma delivery_fee (en la moneda base del
--     menú) al total; 'zone' o null = "según la zona, el local te confirma".

alter table public.restaurants
  add column if not exists menu_bs_rate_updated_at timestamptz,
  add column if not exists menu_cop_rate_updated_at timestamptz,
  add column if not exists delivery_fee_mode text,
  add column if not exists delivery_fee numeric(12, 2);

alter table public.restaurants
  drop constraint if exists restaurants_delivery_fee_mode_valid;
alter table public.restaurants
  add constraint restaurants_delivery_fee_mode_valid
  check (delivery_fee_mode is null or delivery_fee_mode in ('fixed', 'zone'));

alter table public.restaurants
  drop constraint if exists restaurants_delivery_fee_valid;
alter table public.restaurants
  add constraint restaurants_delivery_fee_valid
  check (delivery_fee is null or (delivery_fee > 0 and delivery_fee <= 100000000));

comment on column public.restaurants.menu_bs_rate_updated_at is
  'Cuándo cambió menu_bs_rate. Null si la tasa es automática (BCV).';
comment on column public.restaurants.menu_cop_rate_updated_at is
  'Cuándo cambió menu_cop_rate. Null si la tasa es automática (del día).';
comment on column public.restaurants.delivery_fee_mode is
  'fixed = suma delivery_fee al pedido; zone o null = según la zona.';
comment on column public.restaurants.delivery_fee is
  'Costo fijo del delivery en la moneda base del menú. Solo cuenta con delivery_fee_mode = fixed.';

-- Las tasas propias que ya existen: la mejor aproximación es la última vez
-- que se tocó el local.
update public.restaurants set menu_bs_rate_updated_at = updated_at
  where menu_bs_rate is not null and menu_bs_rate_updated_at is null;
update public.restaurants set menu_cop_rate_updated_at = updated_at
  where menu_cop_rate is not null and menu_cop_rate_updated_at is null;

create or replace function public.stamp_menu_rate_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.menu_bs_rate_updated_at := case when new.menu_bs_rate is null then null else now() end;
    new.menu_cop_rate_updated_at := case when new.menu_cop_rate is null then null else now() end;
    return new;
  end if;

  if new.menu_bs_rate is null then
    new.menu_bs_rate_updated_at := null;
  elsif new.menu_bs_rate is distinct from old.menu_bs_rate then
    new.menu_bs_rate_updated_at := now();
  end if;

  if new.menu_cop_rate is null then
    new.menu_cop_rate_updated_at := null;
  elsif new.menu_cop_rate is distinct from old.menu_cop_rate then
    new.menu_cop_rate_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_stamp_menu_rate_dates on public.restaurants;
create trigger trg_stamp_menu_rate_dates
  before insert or update on public.restaurants
  for each row execute function public.stamp_menu_rate_dates();

grant select (menu_bs_rate_updated_at, menu_cop_rate_updated_at, delivery_fee_mode, delivery_fee)
  on public.restaurants to anon, authenticated;
