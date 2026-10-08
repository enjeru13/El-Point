# Piezas editables para Figma

Cada `.svg` es una pieza de Instagram con el texto como texto real y las formas
como vectores. Los teléfonos, sus sombras y el pin del logo van como imágenes.

## Cómo abrirlos

1. Instala las fuentes (gratis, Google Fonts): **Outfit** y **Plus Jakarta Sans**.
   Si no las tienes, Figma las sustituye y el texto se desacomoda.
2. Arrastra el `.svg` al lienzo de Figma. Queda como un frame de 1080x1350
   (feed) o 1080x1920 (story).

## Paleta

- Naranja marca: `#C8451F`
- Naranja claro: `#E0632F`
- Naranja vivo: `#FF7A3A`
- Tinta: `#241A16`
- Crema: `#FDF8F6`
- Gris cálido (texto secundario): `#6B5B52`

## Carpetas

- `*.svg`: lote principal (feed 01 a 09, stories 10 a 12).
- `teasers/`: piezas de expectativa.
- `logo/`: ícono de la app (1024 px, ideal para foto de perfil) y pines sin fondo.

## Regenerar

Si cambias textos en `marketing/make_pack.py` o `marketing/make_teasers.py`:

    python marketing/make_svg.py
