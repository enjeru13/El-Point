-- Expose lat/lng as plain columns derived from the PostGIS point, so every
-- place list (search, feed, etc.) can compute distance without the RPC.

alter table public.restaurants
  add column if not exists latitude double precision
    generated always as (st_y(location::geometry)) stored,
  add column if not exists longitude double precision
    generated always as (st_x(location::geometry)) stored;
