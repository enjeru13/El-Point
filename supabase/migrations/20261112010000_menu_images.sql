-- Menú en imágenes (función del plan): hasta 10 fotos de la carta, en el orden que
-- el dueño elija, aparte de la galería de 9 fotos del local.
--
-- Mismo modelo que restaurant_photos: los archivos van al bucket público
-- restaurant-media, en la carpeta del local ("<restaurant_id>/menu-pages/<archivo>.jpg"),
-- así que las reglas de escritura del bucket (solo el dueño de la carpeta) se aplican
-- igual. Esta tabla guarda cuáles son y en qué orden; se lee solo si el local tiene plan
-- (o eres el dueño o el admin), igual que el menú en PDF y la galería.

create table if not exists public.restaurant_menu_images (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  storage_path text not null,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_menu_images_restaurant_idx
  on public.restaurant_menu_images (restaurant_id, position);

alter table public.restaurant_menu_images enable row level security;

drop policy if exists "menu images visible with plan" on public.restaurant_menu_images;
create policy "menu images visible with plan"
  on public.restaurant_menu_images for select
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

drop policy if exists "owner inserts menu images" on public.restaurant_menu_images;
create policy "owner inserts menu images"
  on public.restaurant_menu_images for insert to authenticated
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id
        and r.owner_id = (select auth.uid())
        and public.restaurant_has_plan(r.id)
    )
  );

drop policy if exists "owner updates menu images" on public.restaurant_menu_images;
create policy "owner updates menu images"
  on public.restaurant_menu_images for update to authenticated
  using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
  );

drop policy if exists "owner deletes menu images" on public.restaurant_menu_images;
create policy "owner deletes menu images"
  on public.restaurant_menu_images for delete to authenticated
  using (
    exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = (select auth.uid()))
  );

grant select on public.restaurant_menu_images to anon, authenticated;
grant insert, update, delete on public.restaurant_menu_images to authenticated;

-- Tope de 10 imágenes de menú por local.
create or replace function public.restaurant_menu_images_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Un candado por local: dos subidas a la vez no pueden pasarse del tope.
  perform pg_advisory_xact_lock(hashtextextended('menu_images:' || new.restaurant_id::text, 0));
  if (select count(*) from public.restaurant_menu_images where restaurant_id = new.restaurant_id) >= 10 then
    raise exception 'menu_images_limit: máximo 10 imágenes de menú por local';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restaurant_menu_images_limit on public.restaurant_menu_images;
create trigger trg_restaurant_menu_images_limit
  before insert on public.restaurant_menu_images
  for each row execute function public.restaurant_menu_images_limit();
