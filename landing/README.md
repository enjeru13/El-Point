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

## Badges oficiales de las tiendas

Los SVG oficiales ya están en `landing/assets/` (variante español LATAM):

| Archivo | Badge |
|---|---|
| `assets/googleplay-es.svg` | "Consíguelo en Google Play" (color) |
| `assets/appstore-es.svg` | "Descárgalo en el App Store" (negro) |
| `assets/appstore-es-white.svg` | idem, blanco (para fondo oscuro) |

**NO se muestran todavía.** Apple y Google solo permiten estos badges enlazando
a una ficha PUBLICADA de la app. Hasta entonces quedan los botones "Pronto en…".

Cuando la app esté publicada (o haya pre-registro en Google Play), reemplazar
en `index.html` cada bloque `<a class="store">…</a>` por:

```html
<a href="URL_REAL_DE_LA_FICHA" target="_blank" rel="noopener">
  <img src="assets/googleplay-es.svg" alt="Consíguelo en Google Play" height="52" />
</a>
```

(Apple pide alto mínimo 40px y respetar el área de protección; Google, alto
mínimo 48px. Ambos: no recolorear ni deformar.)

## Pendiente

- Confirmar que `atencion.elpoint@gmail.com` existe y recibe (está aquí y en las
  pantallas legales de la app).
- Reemplazar el mock del teléfono / los placeholders de `.shots` por capturas
  reales (`landing/shots/1.png` … `5.png`).
- Mostrar los badges oficiales cuando la app esté publicada (ver arriba).
