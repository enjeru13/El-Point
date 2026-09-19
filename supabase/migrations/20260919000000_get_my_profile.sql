-- Fase 2 de profiles, paso 1 (aditivo, no rompe nada): una función para que
-- cada usuario lea SU fila completa. En el paso 2 se ocultan a los demás las
-- columnas sensibles (is_admin, strikes, referral_code, settings, xp...), y
-- la app y el panel admin leerán su propio perfil por aquí en vez de un
-- select directo, que ya no podrá ver esas columnas.
--
-- security definer + where id = auth.uid(): solo devuelve la fila de quien
-- llama. Para anon no devuelve nada.

create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;
