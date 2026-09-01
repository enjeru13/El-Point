-- Public bucket for review photos. Path: "<review_id>/<n>"
-- Read: public. Write: the review's author only.

insert into storage.buckets (id, name, public, file_size_limit)
values ('review-photos', 'review-photos', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;

create or replace function public.owns_review_path(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.reviews r
    where r.id::text = (storage.foldername(object_name))[1]
      and r.author_id = (select auth.uid())
  );
$$;

drop policy if exists "review-photos public read" on storage.objects;
create policy "review-photos public read"
  on storage.objects for select
  using (bucket_id = 'review-photos');

drop policy if exists "review-photos author insert" on storage.objects;
create policy "review-photos author insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'review-photos' and public.owns_review_path(name));

drop policy if exists "review-photos author delete" on storage.objects;
create policy "review-photos author delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'review-photos' and public.owns_review_path(name));
