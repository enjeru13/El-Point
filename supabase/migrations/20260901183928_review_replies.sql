-- Owner reply to a review. One reply per review, editable by its author.

create table if not exists public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.reviews (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists review_replies_review_idx on public.review_replies (review_id);

drop trigger if exists trg_review_replies_updated_at on public.review_replies;
create trigger trg_review_replies_updated_at
  before update on public.review_replies
  for each row execute function public.set_updated_at();

alter table public.review_replies enable row level security;

drop policy if exists "review replies are viewable by everyone" on public.review_replies;
create policy "review replies are viewable by everyone"
  on public.review_replies for select
  using (true);

-- Only the owner of the reviewed restaurant may reply.
drop policy if exists "restaurant owner inserts reply" on public.review_replies;
create policy "restaurant owner inserts reply"
  on public.review_replies for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1
      from public.reviews rv
      join public.restaurants r on r.id = rv.restaurant_id
      where rv.id = review_id and r.owner_id = (select auth.uid())
    )
  );

drop policy if exists "reply author updates own reply" on public.review_replies;
create policy "reply author updates own reply"
  on public.review_replies for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "reply author deletes own reply" on public.review_replies;
create policy "reply author deletes own reply"
  on public.review_replies for delete to authenticated
  using (author_id = (select auth.uid()));

grant select on public.review_replies to anon, authenticated;
grant insert, update, delete on public.review_replies to authenticated;

-- Notify the review author when the owner replies.
create or replace function public.notify_reviewer_on_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rv_author uuid;
  rv_restaurant uuid;
  r_name text;
begin
  select author_id, restaurant_id into rv_author, rv_restaurant
  from public.reviews where id = new.review_id;

  if rv_author is null or rv_author = new.author_id then
    return null;
  end if;

  select name into r_name from public.restaurants where id = rv_restaurant;

  insert into public.notifications (recipient_id, type, title, body, data)
  values (
    rv_author,
    'reply',
    coalesce(r_name, 'Un local') || ' respondió tu reseña',
    left(new.body, 100),
    jsonb_build_object('restaurant_id', rv_restaurant, 'review_id', new.review_id)
  );
  return null;
end;
$$;

drop trigger if exists trg_notify_reviewer_on_reply on public.review_replies;
create trigger trg_notify_reviewer_on_reply
  after insert on public.review_replies
  for each row execute function public.notify_reviewer_on_reply();
