# El Point 🔥

Aplicación móvil de descubrimiento gastronómico con gamificación social. Los usuarios rankean restaurantes, suben de nivel y compiten en una comunidad de comensales.

## Stack

- **Framework:** Expo SDK 54 / React Native
- **Navegación:** Expo Router v6 (file-based)
- **Base de datos / Auth:** Supabase
- **Estilos:** NativeWind + tema custom (tokens en `lib/theme.ts`)
- **Mapas:** `react-native-maps`
- **Gestos:** `react-native-gesture-handler` + `@gorhom/bottom-sheet`

## Estructura

```
app/
├── (auth)/          # Login, registro cliente/owner
├── (customer)/      # Home, Mapa, Búsqueda, Perfil (cliente)
├── (owner)/         # Dashboard, Analytics, Settings (dueño)
└── restaurant/      # Perfil de restaurante [id]

components/ui/
├── AppLogo             # Logo "el Point" con variantes
├── ScreenHeader        # Header con safe area estandarizado
├── SearchBar           # Barra de búsqueda unificada
├── NotificationsSheet  # Dropdown de notificaciones
├── StarBadge           # Badge de rating
├── StarRow             # Fila de estrellas
├── SectionTitle        # Título de sección con icono
└── Card                # Card base neo-brutalist

lib/
├── theme.ts         # Tokens de color, sombras, constantes de layout
└── supabase.ts      # Cliente Supabase
```

## Roles

| Rol | Ruta |
|-----|------|
| Cliente | `/(customer)` — feed, mapa, búsqueda, perfil |
| Dueño | `/(owner)` — dashboard, analytics, settings |

El rol se obtiene de `profiles.role` en Supabase al iniciar sesión.

## Gamificación

Los clientes acumulan XP al dejar reseñas ("ranks"). Sistema de niveles con rangos progresivos:

> Novato → Explorador → Comensal Experto → Crítico Local → Gurú Gastronómico

## Diseño

Estética **neo-brutalist**: bordes sólidos `borderWidth: 2`, sombras duras, tipografía bold. Paleta naranja primario (`#ab3500`) con acentos dorados y rosados.

Fuentes: `Outfit` (títulos) + `Plus Jakarta Sans` (cuerpo).

## Setup

```bash
npm install
npx expo start
```

Requiere variables de entorno de Supabase en `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```
