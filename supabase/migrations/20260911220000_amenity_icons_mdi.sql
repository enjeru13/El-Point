-- Amenity icons get the same treatment as categories: force MaterialCommunityIcons
-- ("mdi:" prefix in components/ui/Icon.tsx) instead of the bare-name lucide-first
-- lookup, which was giving a couple of them mismatched/inconsistent glyphs.
-- A few bare names also don't exist at all in either icon set and need a
-- like-for-like MDI substitute (verified against the installed glyphmap).

update public.amenities set icon = 'mdi:wifi' where slug = 'wifi';
update public.amenities set icon = 'mdi:parking' where slug = 'parking';
update public.amenities set icon = 'mdi:air-conditioner' where slug = 'air_conditioning';
update public.amenities set icon = 'mdi:umbrella' where slug = 'outdoor_seating';
update public.amenities set icon = 'mdi:human-baby-changing-table' where slug = 'baby_changing';
update public.amenities set icon = 'mdi:car-child-seat' where slug = 'high_chair';
update public.amenities set icon = 'mdi:wheelchair-accessibility' where slug = 'wheelchair_accessible';
update public.amenities set icon = 'mdi:paw' where slug = 'pet_friendly';
update public.amenities set icon = 'mdi:credit-card' where slug = 'cards_accepted';
update public.amenities set icon = 'mdi:cash' where slug = 'cash_only';
update public.amenities set icon = 'mdi:toy-brick' where slug = 'playground';
update public.amenities set icon = 'mdi:bike' where slug = 'delivery';
update public.amenities set icon = 'mdi:bag-personal-outline' where slug = 'takeaway';
update public.amenities set icon = 'mdi:calendar-check' where slug = 'reservations';
update public.amenities set icon = 'mdi:music' where slug = 'live_music';
update public.amenities set icon = 'mdi:television' where slug = 'tv_sports';
update public.amenities set icon = 'mdi:glass-cocktail' where slug = 'bar';
update public.amenities set icon = 'mdi:smoking' where slug = 'smoking_area';
