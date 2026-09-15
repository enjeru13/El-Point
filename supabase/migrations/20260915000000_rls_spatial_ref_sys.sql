-- Supabase linter: "RLS Disabled in Public" en public.spatial_ref_sys.
-- Tabla de referencia de PostGIS (códigos EPSG), no datos nuestros --
-- se activa RLS con lectura pública, mismo patrón que categories/amenities.

alter table public.spatial_ref_sys enable row level security;

drop policy if exists "spatial_ref_sys is viewable by everyone" on public.spatial_ref_sys;
create policy "spatial_ref_sys is viewable by everyone"
  on public.spatial_ref_sys for select
  using (true);
