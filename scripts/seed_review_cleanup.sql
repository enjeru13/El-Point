-- ═══════════════════════════════════════════════════════════════════════════
-- Limpieza después de la aprobación de Apple, ANTES de liberar la app.
--
-- Borra los 6 locales de demostración (scripts/seed_review.sql) y deja intacto:
--   * tu cuenta de administrador,
--   * las cuentas de revisión (comensal y dueño),
--   * el local de la cuenta de revisión, que queda PAUSADO (Local visible apagado)
--     para que el público no lo vea. Antes de enviar una versión nueva a revisión,
--     se vuelve a encender; al terminar, se pausa otra vez.
--
-- Edita los dos correos de revisión si son otros.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- 1. Locales de demostración (en cascada: platos, fotos, comodidades, pagos...)
delete from public.restaurants where id::text like 'a0de0000-%';

-- 2. Pausar el local de la cuenta de revisión
update public.restaurants
set is_active = false
where owner_id in (
  select id from auth.users where email = 'atencion.elpoint+dueno@gmail.com'
);

commit;

select name, status, is_active, founder_rank
from public.restaurants
order by created_at;
