-- Las promociones vencen.
--
-- Antes una promo se quedaba publicada hasta que el dueño la borraba, y
-- muchas se olvidaban: el comensal llegaba por una oferta que ya no existía.
-- Ahora la promo puede tener fecha de fin (promo_ends_at). Sin fecha sigue
-- hasta que se quite.
--
-- La app oculta una promo vencida al instante comparando con esa fecha; el
-- trabajo programado de abajo, cada hora, la limpia de la tabla (así tampoco
-- se muestra como "promo" en ninguna otra consulta).

alter table public.restaurants
  add column if not exists promo_ends_at timestamptz;

comment on column public.restaurants.promo_ends_at is
  'Fin de la promo (promo_text). null = sin fecha de fin. Pasada esta fecha la promo deja de mostrarse y un trabajo la limpia.';

grant select (promo_ends_at) on public.restaurants to anon, authenticated;

create or replace function public.clear_expired_promos()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.restaurants
    set promo_text = null,
        promo_ends_at = null
    where promo_ends_at is not null
      and promo_ends_at <= now();
$$;

revoke execute on function public.clear_expired_promos() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('clear-expired-promos')
  where exists (select 1 from cron.job where jobname = 'clear-expired-promos');

  perform cron.schedule(
    'clear-expired-promos',
    '0 * * * *',                        -- cada hora en punto
    $cron$ select public.clear_expired_promos(); $cron$
  );
exception
  when undefined_table or undefined_function or insufficient_privilege then
    raise notice 'pg_cron not available — enable the extension, then re-run this migration to schedule the job.';
end;
$$;
