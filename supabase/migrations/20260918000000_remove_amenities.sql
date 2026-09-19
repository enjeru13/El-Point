-- Se quitan 8 comodidades del catálogo: Terraza / área exterior (4),
-- Acepta tarjeta (9), Solo efectivo (10), Delivery (12), Para llevar (13),
-- Acepta reservas (14), Bar / cócteles (17) y Zona de fumadores (18).
-- restaurant_amenities.amenity_id tiene on delete cascade: los locales que
-- las tenían marcadas las pierden solas, sin huérfanos.

delete from public.amenities where id in (4, 9, 10, 12, 13, 14, 17, 18);
