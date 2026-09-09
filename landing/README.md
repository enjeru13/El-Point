# El Point — landing

Sitio estático. Sin build. Solo HTML + `styles.css`.

Páginas:

| Archivo | URL final | Uso |
|---|---|---|
| `index.html` | `/` | Vitrina |
| `terminos.html` | `/terminos` | Términos (Play/App Store) |
| `privacidad.html` | `/privacidad` | Privacidad (obligatoria para las tiendas) |
| `soporte.html` | `/soporte` | Soporte (URL de soporte de Play Store) |
| `eliminar-cuenta.html` | `/eliminar-cuenta` | Eliminación de cuenta (obligatoria para Play Store) |

## Deploy en Netlify

**Opción A — repo conectado (recomendado)**

1. app.netlify.com → *Add new site* → *Import from Git* → este repo.
2. Build command: *(vacío)* · Publish directory: `landing`
   (ya está en `netlify.toml` en la raíz del repo).
3. Deploy. Cada push a `main` re-deploya.

**Opción B — sin Git**

`app.netlify.com/drop` → arrastra la carpeta `landing/`.

## Después del deploy

- Cambiar el subdominio en *Site settings → Domain* (ej. `elpoint.netlify.app`)
  o conectar dominio propio.
- Pegar estas URLs en Google Play Console:
  - Política de privacidad: `https://<sitio>/privacidad`
  - Eliminación de cuenta: `https://<sitio>/eliminar-cuenta`
- Soporte en la ficha: `https://<sitio>/soporte` o `atencion.elpoint@gmail.com`.

## Pendiente

- Confirmar los correos `atencion.elpoint@gmail.com` / `atencion.elpoint@gmail.com` (deben
  existir y recibir). Están tanto aquí como en las pantallas legales de la app.
- Reemplazar el mock del teléfono por capturas reales cuando estén.
- Badges reales de las tiendas cuando la app esté publicada.
