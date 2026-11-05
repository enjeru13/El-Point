-- ═══════════════════════════════════════════════════════════════════════════
-- Comunidad (1/6): tablas, RLS, ajustes globales y normalización de nombres.
-- Diseño: docs/superpowers/specs/2026-11-03-comunidad-design.md
--
-- Los posts no se insertan directo: solo con la función create_post
-- (siguiente migración), que valida etiquetas y límites en una transacción.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Ajustes globales (una sola fila) ──────────────────────────────────────
create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  owner_posts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "settings readable" on public.app_settings;
create policy "settings readable"
  on public.app_settings for select to authenticated
  using (true);

drop policy if exists "admin updates settings" on public.app_settings;
create policy "admin updates settings"
  on public.app_settings for update to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

revoke all on public.app_settings from anon;
grant select, update on public.app_settings to authenticated;

-- ─── Nombre de local normalizado, para agrupar sugerencias ─────────────────
-- "Restaurante El Fogón  de Mamá" y "FOGÓN DE MAMA" dan "fogon de mama".
create or replace function public.normalize_place_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    btrim(regexp_replace(
      regexp_replace(
        translate(lower(p_name), 'áéíóúüñàèìòù', 'aeiouunaeiou'),
        '\m(restaurante|restaurant|el|la|los|las)\M', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )),
    ''
  );
$$;

grant execute on function public.normalize_place_name(text) to authenticated;

-- ─── Locales: permiso para publicar como local ─────────────────────────────
alter table public.restaurants
  add column if not exists community_banned_at timestamptz,
  add column if not exists community_removals int not null default 0;

-- ─── Posts ─────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  as_restaurant_id uuid references public.restaurants (id) on delete cascade,
  topic text not null
    check (topic in ('recomiendame', 'locales_nuevos', 'recetas', 'antojos', 'novedades')),
  body text not null check (char_length(body) between 1 and 500),
  restaurant_id uuid references public.restaurants (id) on delete set null,
  suggested_name text check (suggested_name is null or char_length(suggested_name) between 2 and 80),
  suggested_zone text check (suggested_zone is null or char_length(suggested_zone) <= 80),
  suggested_key text generated always as (public.normalize_place_name(suggested_name)) stored,
  client_id uuid not null,
  like_count int not null default 0,
  reply_count int not null default 0,
  moderation text not null default 'visible'
    check (moderation in ('visible', 'hidden', 'removed')),
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint posts_one_place_tag check (not (restaurant_id is not null and suggested_name is not null)),
  constraint posts_client_id_unique unique (author_id, client_id)
);

create index if not exists posts_feed_idx
  on public.posts (created_at desc, id desc) where moderation = 'visible';
create index if not exists posts_restaurant_idx on public.posts (restaurant_id, created_at desc);
create index if not exists posts_suggested_key_idx on public.posts (suggested_key) where suggested_key is not null;
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists posts_as_restaurant_idx on public.posts (as_restaurant_id, created_at desc)
  where as_restaurant_id is not null;

create table if not exists public.post_categories (
  post_id uuid not null references public.posts (id) on delete cascade,
  category_id smallint not null references public.categories (id) on delete cascade,
  primary key (post_id, category_id)
);

create index if not exists post_categories_category_idx on public.post_categories (category_id);

create table if not exists public.post_photos (
  post_id uuid not null references public.posts (id) on delete cascade,
  position smallint not null check (position between 0 and 3),
  storage_path text not null,
  primary key (post_id, position)
);

create table if not exists public.post_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists post_likes_post_idx on public.post_likes (post_id);

create table if not exists public.post_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  as_restaurant_id uuid references public.restaurants (id) on delete cascade,
  -- Local de la app etiquetado en la respuesta (XP de "Recomiéndame").
  restaurant_id uuid references public.restaurants (id) on delete set null,
  body text not null check (char_length(body) between 1 and 500),
  moderation text not null default 'visible'
    check (moderation in ('visible', 'hidden', 'removed')),
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists post_replies_post_idx on public.post_replies (post_id, created_at);
create index if not exists post_replies_author_idx on public.post_replies (author_id, created_at desc);

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id) on delete cascade,
  reply_id uuid references public.post_replies (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('offensive', 'spam', 'false', 'other')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  constraint post_reports_one_target check (num_nonnulls(post_id, reply_id) = 1)
);

create unique index if not exists post_reports_post_unique
  on public.post_reports (post_id, reporter_id) where post_id is not null;
create unique index if not exists post_reports_reply_unique
  on public.post_reports (reply_id, reporter_id) where reply_id is not null;
create index if not exists post_reports_post_idx on public.post_reports (post_id);
create index if not exists post_reports_reply_idx on public.post_reports (reply_id);

-- ─── Locales sugeridos (los que la gente menciona y no están en la app) ────
create table if not exists public.local_suggestions (
  normalized_name text primary key,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'contactado', 'alta', 'descartado')),
  restaurant_id uuid references public.restaurants (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint local_suggestions_alta_needs_restaurant
    check (status <> 'alta' or restaurant_id is not null)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.posts enable row level security;
alter table public.post_categories enable row level security;
alter table public.post_photos enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_replies enable row level security;
alter table public.post_reports enable row level security;
alter table public.local_suggestions enable row level security;

-- Lectura: cualquiera con sesión. El feed filtra la moderación y los
-- bloqueos (community_feed); el detalle también filtra en la app.
drop policy if exists "posts readable" on public.posts;
create policy "posts readable" on public.posts for select to authenticated using (true);

drop policy if exists "post categories readable" on public.post_categories;
create policy "post categories readable" on public.post_categories for select to authenticated using (true);

drop policy if exists "post photos readable" on public.post_photos;
create policy "post photos readable" on public.post_photos for select to authenticated using (true);

drop policy if exists "post likes readable" on public.post_likes;
create policy "post likes readable" on public.post_likes for select to authenticated using (true);

drop policy if exists "post replies readable" on public.post_replies;
create policy "post replies readable" on public.post_replies for select to authenticated using (true);

-- Posts: borrar el propio (o el admin); cambiar moderación solo el admin.
drop policy if exists "author deletes post" on public.posts;
create policy "author deletes post" on public.posts for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_admin((select auth.uid())));

drop policy if exists "admin moderates post" on public.posts;
create policy "admin moderates post" on public.posts for update to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- Fotos: solo el autor del post las agrega o quita.
drop policy if exists "author adds post photo" on public.post_photos;
create policy "author adds post photo" on public.post_photos for insert to authenticated
  with check (exists (
    select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())
  ));

drop policy if exists "author removes post photo" on public.post_photos;
create policy "author removes post photo" on public.post_photos for delete to authenticated
  using (exists (
    select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())
  ));

-- Me gusta: los propios.
drop policy if exists "user likes post" on public.post_likes;
create policy "user likes post" on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "user unlikes post" on public.post_likes;
create policy "user unlikes post" on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Respuestas: crear las propias, borrar las propias (o el admin), moderar el admin.
drop policy if exists "user replies" on public.post_replies;
create policy "user replies" on public.post_replies for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "author deletes reply" on public.post_replies;
create policy "author deletes reply" on public.post_replies for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_admin((select auth.uid())));

drop policy if exists "admin moderates reply" on public.post_replies;
create policy "admin moderates reply" on public.post_replies for update to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

-- Reportes: igual que review_reports.
drop policy if exists "reporter reads own post reports" on public.post_reports;
create policy "reporter reads own post reports" on public.post_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin((select auth.uid())));

drop policy if exists "users report posts" on public.post_reports;
create policy "users report posts" on public.post_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and not exists (
      select 1 from public.profiles pr
      where pr.id = (select auth.uid()) and pr.banned_at is not null
    )
    and not exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = (select auth.uid())
    )
    and not exists (
      select 1 from public.post_replies r
      where r.id = reply_id and r.author_id = (select auth.uid())
    )
  );

drop policy if exists "admin clears post reports" on public.post_reports;
create policy "admin clears post reports" on public.post_reports for delete to authenticated
  using (public.is_admin((select auth.uid())));

-- Sugerencias: solo el admin (las crea create_post, que es security definer).
drop policy if exists "admin reads suggestions" on public.local_suggestions;
create policy "admin reads suggestions" on public.local_suggestions for select to authenticated
  using (public.is_admin((select auth.uid())));

revoke all on public.posts, public.post_categories, public.post_photos, public.post_likes,
  public.post_replies, public.post_reports, public.local_suggestions from anon;
revoke insert, update, delete on public.posts, public.post_categories, public.local_suggestions
  from authenticated;

grant select on public.posts, public.post_categories, public.post_photos, public.post_likes,
  public.post_replies, public.local_suggestions to authenticated;
grant delete on public.posts to authenticated;
grant update (moderation, moderated_at) on public.posts to authenticated;
grant insert, delete on public.post_photos, public.post_likes to authenticated;
grant insert (post_id, author_id, as_restaurant_id, restaurant_id, body), delete
  on public.post_replies to authenticated;
grant update (moderation, moderated_at) on public.post_replies to authenticated;
grant select, insert, delete on public.post_reports to authenticated;

-- ─── Fotos de posts: bucket público "post-photos", ruta "<post_id>/<n>" ─────
insert into storage.buckets (id, name, public, file_size_limit)
values ('post-photos', 'post-photos', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;

create or replace function public.owns_post_path(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.posts p
    where p.id::text = (storage.foldername(object_name))[1]
      and p.author_id = (select auth.uid())
  );
$$;

drop policy if exists "post-photos public read" on storage.objects;
create policy "post-photos public read"
  on storage.objects for select
  using (bucket_id = 'post-photos');

drop policy if exists "post-photos author insert" on storage.objects;
create policy "post-photos author insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-photos' and public.owns_post_path(name));

drop policy if exists "post-photos author delete" on storage.objects;
create policy "post-photos author delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-photos' and public.owns_post_path(name));
