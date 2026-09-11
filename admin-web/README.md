# El Point — Admin Web

Panel de moderación en navegador, para no depender del celular. Vite + React +
TypeScript + Tailwind v4, hablando directo con el mismo proyecto de Supabase
que la app (mismas tablas, mismas políticas RLS, mismas reglas `is_admin()` —
esto no es un backend nuevo, es otro cliente del mismo backend).

## Qué tiene

- **Login** con Google (mismo proveedor que ya usa la app) o correo +
  contraseña, y `profiles.is_admin = true`. Cualquier otra cuenta entra pero
  ve "Sin acceso" — no hay bypass client-side, cada mutación además está
  protegida por RLS/RPC en la base.
- **Resumen** — contadores en vivo de las 4 colas.
- **Locales pendientes** — aprobar / rechazar (con motivo) altas nuevas.
- **Locales reportados** — restaurar o retirar definitivo locales suspendidos
  por reportes.
- **Reseñas reportadas** — mantener o eliminar reseñas reportadas, ordenadas
  por cantidad de reportes.
- **Soporte** — mensajes de contacto de la app, abiertos/resueltos.

## Desarrollo local

```bash
cp .env.example .env   # completa con la URL + publishable key de Supabase
npm install
npm run dev
```

## Deploy (Netlify)

Sitio de Netlify **separado** del de la landing (`elpoint-app.netlify.app`) —
mismo repo de GitHub, pero:

1. New site from Git → elegir este repo.
2. **Base directory**: `admin-web`
3. **Build command**: `npm run build` (ya está en `netlify.toml`)
4. **Publish directory**: `admin-web/dist`
5. Site settings → Environment variables: `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_KEY` (los mismos valores del `.env` de la app / landing).
6. **Importante para el login con Google**: Supabase → Authentication → URL
   Configuration → Redirect URLs — agregá la URL final de este sitio (ej.
   `https://elpoint-admin.netlify.app/**`). Sin esto Google redirige de
   vuelta y Supabase rechaza la sesión. `localhost:5183` ya funciona sin
   tocar nada (Supabase lo permite por defecto en desarrollo).
7. Opcional: poné el sitio en modo "Password protection" (Netlify → Site
   configuration → Visitor access) además del login de Supabase — es un
   panel interno, no hace falta que sea indexable ni público. `index.html`
   ya manda `noindex, nofollow`.

## Por qué así

- **Vite, no Next.js**: es un dashboard 100% cliente contra Supabase, no hay
  nada que rentabilice SSR/rutas de servidor acá.
- **Netlify, no otra cosa**: ya tenemos cuenta y flujo con la landing; un
  sitio nuevo en la misma cuenta es gratis y cero fricción.
- **La key en el bundle**: es la anon/publishable key, la misma que ya viaja
  dentro del APK/IPA de la app — no es secreta, la seguridad real la pone
  RLS del lado de Postgres.
