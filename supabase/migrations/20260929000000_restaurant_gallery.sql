-- Galería de fotos del local (función del plan): hasta 8 fotos de la comida y
-- del sitio, en el orden que el dueño elija, que el comensal ve en el perfil.
--
-- Los archivos van al bucket público restaurant-media, en la carpeta del local
-- ("<restaurant_id>/gallery/<archivo>.jpg"), así que las reglas de escritura
-- que ya existen para ese bucket (solo el dueño de la carpeta) se aplican igual.
-- Esta tabla guarda cuáles son y en qué orden; se lee solo si el local tiene
-- plan (o eres el dueño o el admin), igual que el menú.

create table if not exists public.restaurant_photos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  storage_path text not null,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_photos_restaurant_idx
  on public.restaurant_photos (restaurant_id, position);

alter table public.restaurant_photos enable row level security;

drop policy if exists "gallery visible with plan" on public.restaurant_photos;
create policy "gallery visible with plan"
  on public.restaurant_photos for select
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and (
          (r.status = 'approved' and r.is_active and public.restaurant_has_plan(r.id))
          or r.owner_id = (select auth.uid())
          or public.is_admin((select auth.uid()))
        )
    )
  );

drop policy if exists "owner inserts gallery photos" on public.restaurant_photos;
create policy "owner inserts gallery photos"
  on public.restaurant_photos for insert to authenticated
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and r.owner_id = (select auth.uid())
        and public.restaurant_has_plan(r.id)
    )
  );

drop policy if exists "owner updates gallery photos" on public.restaurant_photos;
create policy "owner updates gallery photos"
  on public.restaurant_photos for update to authenticated
  using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
  );

drop policy if exists "owner deletes gallery photos" on public.restaurant_photos;
create policy "owner deletes gallery photos"
  on public.restaurant_photos for delete to authenticated
  using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
  );

grant select on public.restaurant_photos to anon, authenticated;
grant insert, update, delete on public.restaurant_photos to authenticated;

-- Tope de 8 fotos por local.
create or replace function public.restaurant_photos_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.restaurant_photos where restaurant_id = new.restaurant_id) >= 8 then
    raise exception 'gallery_limit: máximo 8 fotos por local';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restaurant_photos_limit on public.restaurant_photos;
create trigger trg_restaurant_photos_limit
  before insert on public.restaurant_photos
  for each row execute function public.restaurant_photos_limit();
