-- Supabase linter: "RLS Disabled in Public" en public.spatial_ref_sys.
--
-- Es tabla de la extensión PostGIS (códigos EPSG) -- no somos dueños,
-- "alter table ... enable row level security" falla con
-- "must be owner of table" (42501), no se puede activar RLS ahí.
--
-- Fix real: nunca la consultamos desde la app, así que se le quita el
-- acceso a los roles que usa PostgREST -- deja de estar expuesta por
-- la API, que es lo que de verdad le preocupa al linter.

revoke select on public.spatial_ref_sys from anon, authenticated;
