-- Cuisine preferences captured at sign-up; used to rank the home feed.

alter table public.profiles
  add column if not exists favorite_categories smallint[] not null default '{}';
