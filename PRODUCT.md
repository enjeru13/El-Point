# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

- **Comensal (usuario principal):** persona en San Cristóbal, Táchira (Venezuela) que decide dónde comer o pedir. Usa el teléfono, a veces en la calle, quiere ver rápido qué hay cerca o abierto ahora, cómo es el local, el menú con precios y qué dice la gente. Deja reseñas ("ranks") con estrellas, fotos y comentario.
- **Dueño de local:** gestiona su perfil, menú, horario, promociones y reseñas desde la pestaña "Mi local" y las métricas. Es quien, con un plan, desbloquea el perfil completo.
- **Operador (administrador):** una sola persona (el fundador) usa un panel web para aprobar locales, registrar pagos, suspender y ver estadísticas.

Prioridad de diseño: el comensal primero; el dueño después.

## Product Purpose

El Point es la guía de restaurantes de San Cristóbal. El comensal descubre dónde comer por categoría, cercanía y horario, ve el menú con precios, contacta al local por WhatsApp y deja su rank. Cada rank da XP, niveles y rangos (gamificación). Éxito: que la gente use El Point para decidir dónde comer y que los locales de la ciudad quieran tener su perfil completo.

## Positioning

Una guía local hecha para una sola ciudad, con reseñas de la comunidad y menús con precios en la moneda que usa cada local (dólares, bolívares o pesos), contacto directo por WhatsApp y "cocinas fantasma" (negocios solo delivery o pickup). Una guía global no sabe de tasas en bolívares, de pedir por WhatsApp ni de los negocios de barrio.

## Operating Context

- Mercado único al lanzamiento: San Cristóbal, Táchira. Idioma: español de Venezuela (es-VE), tuteo con "tú", nunca voseo.
- Modelo: todo local aprobado y activo aparece gratis (nombre, categorías, dirección, mapa, reseñas visibles). El perfil completo (contacto, menú, fotos, horario, promos, comodidades, pagos, responder reseñas, métricas, QR, Destacado) requiere un plan. Los primeros 100 locales son "Originales" con perfil completo gratis para siempre. Los pagos se cobran fuera de la app.
- Superficies: app móvil (Expo / React Native con NativeWind, iOS primero y Android después), página web de presentación (`landing/`, HTML estático en Netlify) y panel admin web (`admin-web/`, React + Vite + Tailwind v4, uso interno).
- Una sola persona opera todo el producto.

## Capabilities and Constraints

- **Reglas de las tiendas (vinculantes):** la app no muestra precios de planes ni pasos de pago ni dirige a pagar fuera de ella (Apple 3.1.1 y Google Play). Los precios de los planes viven solo en la web (landing y términos).
- **Perfil gratuito vs plan:** el servidor oculta contacto, menú y demás datos del perfil completo a quien no tiene plan; la interfaz debe mostrar esa diferencia sin engañar.
- **Cuenta y contenido:** reseñas con reportes, bloqueo de usuarios, moderación, eliminación de cuenta dentro de la app, inicio de sesión con correo, Google y Apple.
- **Tecnología:** Expo SDK 54, expo-router v6, NativeWind, Supabase (RLS, funciones, cron), React Query, actualizaciones por aire (EAS Update). La app es de un solo diseño propio, no sigue el estilo nativo de iOS o Android.
- **Aún sin decidir:** cómo se verá el diseño de Android; capturas y fotos propias de locales reales.

## Brand Commitments

- Nombre **El Point**, el logo con el pin y el naranja de marca `#c8451f`. Se conservan.
- Tono es-VE con "tú", cercano y directo; sin voseo.
- Las reglas de las tiendas sobre precios y pagos (arriba).

## Evidence on Hand

- Logo, ícono y pantalla de carga en `assets/images/`; piezas de marketing en `marketing/`; capturas web en `landing/shots/`.
- Locales de demostración (scripts/seed_review.sql) y una cuenta de revisión; **no hay todavía locales reales, testimonios, métricas ni cifras de uso**. No inventar ninguno.
- Los textos de la ficha de la App Store están en `docs/app-store.md`.

## Product Principles

1. **Lo local manda:** moneda, lenguaje y datos reales de San Cristóbal antes que patrones genéricos de apps de comida.
2. **Decidir rápido:** el comensal tiene que poder elegir dónde comer en pocos toques; lo importante (abierto ahora, distancia, promo, precio) se ve sin abrir el local.
3. **Honestidad con el plan:** lo gratuito se ve completo y limpio; lo que requiere plan se muestra sin tapar ni engañar, y nunca con precios dentro de la app.
4. **Confianza de la comunidad:** reseñas, reportes y bloqueos visibles y fáciles; la moderación es parte del producto.
5. **Un operador, poco mantenimiento:** todo lo que se diseñe debe poder mantenerlo una persona sola.

## Accessibility & Inclusion

Textos legibles en modo claro y oscuro, objetivos táctiles cómodos y lenguaje claro en español de Venezuela. No hay un estándar formal exigido todavía.
