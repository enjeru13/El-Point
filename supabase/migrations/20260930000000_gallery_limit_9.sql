-- La galería admite hasta 9 fotos por local (una cuadrícula de 3 x 3).
create or replace function public.restaurant_photos_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.restaurant_photos where restaurant_id = new.restaurant_id) >= 9 then
    raise exception 'gallery_limit: máximo 9 fotos por local';
  end if;
  return new;
end;
$$;
