-- "shrimp" no existe en el set de MaterialCommunityIcons empaquetado
-- (WARN "shrimp" is not a valid icon name for family "material-community")
-- -- MDI de verdad no tiene camarón/cangrejo/langosta en esta versión. Sí
-- existe como ícono de Lucide (components/ui/Icon.tsx ya lo mapea:
-- `shrimp: Shrimp`), así que se guarda SIN el prefijo "mdi:" para que
-- Icon.tsx lo resuelva por Lucide en vez de forzar MDI.
update public.categories set icon = 'shrimp' where id = 11;
