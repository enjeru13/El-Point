-- "Hoy no abrimos": cierre temporal de un solo día.
--
-- Guarda la fecha (hora de Caracas) del día cerrado. La app lo trata como
-- cerrado solo si esa fecha es hoy, así que al día siguiente se reactiva solo
-- sin que el dueño toque nada ni haga falta un trabajo programado.

alter table public.restaurants
  add column if not exists closed_today_date date;

comment on column public.restaurants.closed_today_date is
  'Fecha (America/Caracas) en la que el local no abre por una razón puntual. La app la ignora si no es hoy.';

grant select (closed_today_date) on public.restaurants to anon, authenticated;
