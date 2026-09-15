-- Antes: 1 reseña por (autor, local) de por vida. Ahora: cuantas quiera,
-- pero no más de 1 por semana por local -- deja rankear de nuevo tras
-- volver a comer ahí sin abrir la puerta a spamear reseñas.

alter table public.reviews
  drop constraint if exists reviews_one_per_author_restaurant;

create or replace function public.enforce_review_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.reviews
    where restaurant_id = new.restaurant_id
      and author_id = new.author_id
      and created_at > now() - interval '7 days'
  ) then
    raise exception 'review_rate_limited'
      using detail = 'Ya dejaste un rank en este local esta semana.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviews_rate_limit on public.reviews;
create trigger trg_reviews_rate_limit
  before insert on public.reviews
  for each row execute function public.enforce_review_rate_limit();
