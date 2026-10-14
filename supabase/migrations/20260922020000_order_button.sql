-- Botón "Pedir por WhatsApp".
--
-- El dueño decide si lo muestra (apagado por defecto: un local donde solo se
-- come en sitio no quiere recibir pedidos) y puede personalizar el saludo del
-- mensaje. Solo se ofrece con plan; la cocina fantasma lo conserva siempre,
-- porque su WhatsApp ya es gratis y es lo único que tiene para vender.
--
-- El número de WhatsApp sigue saliendo solo de get_restaurant_contact(), así
-- que un local sin plan que no es cocina fantasma no puede dar el botón aunque
-- alguien lo active por la API: no hay número que abrir.

alter table public.restaurants
  add column if not exists accepts_orders boolean not null default false,
  add column if not exists order_greeting text;

alter table public.restaurants
  drop constraint if exists restaurants_order_greeting_len;
alter table public.restaurants
  add constraint restaurants_order_greeting_len
  check (order_greeting is null or char_length(order_greeting) <= 200);

comment on column public.restaurants.accepts_orders is
  'El dueño recibe pedidos por WhatsApp: muestra el botón "Pedir" (con plan).';
comment on column public.restaurants.order_greeting is
  'Saludo propio del mensaje de pedido; null usa el mensaje por defecto. Máximo 200 caracteres.';

-- Las columnas nuevas de restaurants hay que conceder una por una (el select de
-- tabla está revocado).
grant select (accepts_orders, order_greeting) on public.restaurants to anon, authenticated;

-- Interacciones: pedidos iniciados.
alter table public.restaurant_events
  drop constraint if exists restaurant_events_event_type_check;
alter table public.restaurant_events
  add constraint restaurant_events_event_type_check
  check (event_type in (
    'view', 'whatsapp', 'call', 'directions', 'instagram', 'menu', 'blocked', 'order'
  ));
