-- Optional promo/offer shown as a badge on the restaurant.
-- Non-empty text = active promo. Owners edit this from their dashboard.

alter table public.restaurants
  add column if not exists promo_text text
    check (promo_text is null or char_length(promo_text) between 3 and 80);
