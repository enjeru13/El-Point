-- Per-user app preferences (notification/sound/haptics toggles, etc.)
-- Free-form JSON; client applies defaults for missing keys.

alter table public.profiles
  add column if not exists settings jsonb not null default '{}'::jsonb;
