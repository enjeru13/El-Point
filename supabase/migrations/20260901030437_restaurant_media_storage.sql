-- Public bucket for restaurant logos / covers / menu PDFs.
-- Path convention: "<restaurant_id>/<logo|cover|menu>.<ext>"
-- Read: public. Write: the restaurant's owner only.

insert into storage.buckets (id, name, public, file_size_limit)
values ('restaurant-media', 'restaurant-media', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;

-- Helper: does the current user own the restaurant referenced by the object path?
create or replace function public.owns_restaurant_path(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.restaurants r
    where r.id::text = (storage.foldername(object_name))[1]
      and r.owner_id = (select auth.uid())
  );
$$;

drop policy if exists "restaurant-media public read" on storage.objects;
create policy "restaurant-media public read"
  on storage.objects for select
  using (bucket_id = 'restaurant-media');

drop policy if exists "restaurant-media owner insert" on storage.objects;
create policy "restaurant-media owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'restaurant-media' and public.owns_restaurant_path(name));

drop policy if exists "restaurant-media owner update" on storage.objects;
create policy "restaurant-media owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'restaurant-media' and public.owns_restaurant_path(name))
  with check (bucket_id = 'restaurant-media' and public.owns_restaurant_path(name));

drop policy if exists "restaurant-media owner delete" on storage.objects;
create policy "restaurant-media owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'restaurant-media' and public.owns_restaurant_path(name));
