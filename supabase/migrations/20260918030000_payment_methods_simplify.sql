-- Catálogo de métodos de pago simplificado a 6: Efectivo, Punto de venta,
-- Pago móvil, Zelle, Transferencia y Binance. "Efectivo" no distingue moneda
-- (Bs, USD, COP, euros): se entiende que es cualquiera.

-- Los locales que ya tenían Efectivo (USD) o (COP) pasan a Efectivo.
insert into public.restaurant_payment_methods (restaurant_id, payment_method_id)
select restaurant_id, 1
from public.restaurant_payment_methods
where payment_method_id in (2, 3)
on conflict do nothing;

delete from public.payment_methods where id in (2, 3);

update public.payment_methods set label = 'Efectivo'       where id = 1;
update public.payment_methods set label = 'Punto de venta' where id = 6;
update public.payment_methods set slug = 'binance', label = 'Binance' where id = 8;

update public.payment_methods set sort_order = case id
  when 1 then 1  -- Efectivo
  when 6 then 2  -- Punto de venta
  when 4 then 3  -- Pago móvil
  when 5 then 4  -- Zelle
  when 7 then 5  -- Transferencia
  when 8 then 6  -- Binance
end
where id in (1, 4, 5, 6, 7, 8);
