# -*- coding: utf-8 -*-
"""Exporta las piezas de Instagram como SVG con texto editable (para Figma).
Correr desde la raíz del repo:  python marketing/make_svg.py

No duplica el diseño: reutiliza las funciones de make_pack.py y make_teasers.py
y les cambia el "lienzo" por uno que graba SVG en vez de pintar píxeles.
Texto, rectángulos, círculos y líneas salen como elementos vectoriales; los
teléfonos, sombras y el pin del logo salen como imágenes PNG incrustadas."""

import base64
import io
import math
import os
import sys
from xml.sax.saxutils import escape

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_pack as mp  # noqa: E402
import make_teasers as mt  # noqa: E402

OUT = os.path.join(mp.ROOT, "marketing", "figma")
_real_draw = ImageDraw.Draw
_measure = _real_draw(Image.new("RGB", (4, 4)))


def rgba(c):
    """Devuelve (fill 'rgb(...)', opacidad) desde una tupla de 3 o 4 valores."""
    r, g, b = c[:3]
    a = (c[3] / 255) if len(c) > 3 else 1
    return f"rgb({r},{g},{b})", a


def paint(attr, c):
    col, a = rgba(c)
    s = f' {attr}="{col}"'
    if a < 1:
        s += f' {attr}-opacity="{a:.3f}"'
    return s


class SvgCanvas:
    def __init__(self, size, bg):
        self.size = size
        self.width, self.height = size
        self.bg = bg
        self.items = []
        self.n_img = 0

    def alpha_composite(self, im, dest=(0, 0)):
        buf = io.BytesIO()
        im.convert("RGBA").save(buf, "PNG", optimize=True)
        data = base64.b64encode(buf.getvalue()).decode()
        self.n_img += 1
        x, y = dest
        self.items.append(
            f'<image id="imagen-{self.n_img}" x="{x}" y="{y}" width="{im.width}" height="{im.height}" '
            f'href="data:image/png;base64,{data}"/>'
        )

    def to_svg(self):
        w, h = self.size
        defs, bg = self.bg
        body = "\n  ".join(self.items)
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">\n'
                f"  <defs>{defs}</defs>\n  {bg}\n  {body}\n</svg>\n")


class SvgDraw:
    def __init__(self, canvas):
        self.c = canvas

    def textlength(self, text, font=None, **kw):
        return _measure.textlength(text, font=font)

    def text(self, xy, text, font=None, fill=(0, 0, 0), **kw):
        base = os.path.basename(font.path)
        fam, rest = base.rsplit(".", 1)[0].split("_", 1)
        weight = "".join(ch for ch in rest if ch.isdigit()) or "400"
        family = {"Outfit": "Outfit", "PlusJakartaSans": "Plus Jakarta Sans"}.get(fam, fam)
        y = xy[1] + font.getmetrics()[0]
        self.c.items.append(
            f'<text x="{xy[0]:.1f}" y="{y:.1f}" font-family="{family}, sans-serif" font-size="{font.size}" '
            f'font-weight="{weight}"{paint("fill", fill)}>{escape(text)}</text>'
        )

    def _shape(self, tag, attrs, fill, outline, width):
        s = f"<{tag} {attrs}"
        s += paint("fill", fill) if fill is not None else ' fill="none"'
        if outline is not None and width:
            s += paint("stroke", outline) + f' stroke-width="{width}"'
        self.c.items.append(s + "/>")

    def rounded_rectangle(self, box, radius=0, fill=None, outline=None, width=1):
        x0, y0, x1, y1 = box
        inset = width / 2 if (outline is not None and width) else 0
        x0, y0, x1, y1 = x0 + inset, y0 + inset, x1 - inset, y1 - inset
        r = max(radius - inset, 0)
        self._shape("rect", f'x="{x0:.1f}" y="{y0:.1f}" width="{x1 - x0:.1f}" height="{y1 - y0:.1f}" rx="{r:.1f}"',
                    fill, outline, width)

    def rectangle(self, box, fill=None, outline=None, width=1):
        x0, y0, x1, y1 = box
        self._shape("rect", f'x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}"', fill, outline, width)

    def ellipse(self, box, fill=None, outline=None, width=1):
        x0, y0, x1, y1 = box
        inset = width / 2 if (outline is not None and width) else 0
        x0, y0, x1, y1 = x0 + inset, y0 + inset, x1 - inset, y1 - inset
        self._shape("ellipse", f'cx="{(x0 + x1) / 2:.1f}" cy="{(y0 + y1) / 2:.1f}" rx="{(x1 - x0) / 2:.1f}" '
                    f'ry="{(y1 - y0) / 2:.1f}"', fill, outline, width)

    def line(self, xy, fill=None, width=1, joint=None):
        pts = list(xy)
        if pts and not isinstance(pts[0], (tuple, list)):
            pts = list(zip(pts[0::2], pts[1::2]))
        d = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        join = ' stroke-linejoin="round" stroke-linecap="round"' if joint == "curve" else ""
        self.c.items.append(f'<polyline points="{d}" fill="none"{paint("stroke", fill)} stroke-width="{width}"{join}/>')

    @staticmethod
    def _arc_path(box, start, end):
        x0, y0, x1, y1 = box
        cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
        a, b = math.radians(start), math.radians(end)
        p0 = (cx + rx * math.cos(a), cy + ry * math.sin(a))
        p1 = (cx + rx * math.cos(b), cy + ry * math.sin(b))
        large = 1 if (end - start) % 360 > 180 else 0
        return cx, cy, f"M{p0[0]:.1f},{p0[1]:.1f} A{rx:.1f},{ry:.1f} 0 {large} 1 {p1[0]:.1f},{p1[1]:.1f}"

    def arc(self, box, start, end, fill=None, width=1):
        _, _, d = self._arc_path(box, start, end)
        self.c.items.append(f'<path d="{d}" fill="none"{paint("stroke", fill)} stroke-width="{width}"/>')

    def pieslice(self, box, start, end, fill=None, outline=None, width=1):
        cx, cy, d = self._arc_path(box, start, end)
        self._shape("path", f'd="{d} L{cx:.1f},{cy:.1f} Z"', fill, outline, width)


def draw_proxy(im, *a, **k):
    return SvgDraw(im) if isinstance(im, SvgCanvas) else _real_draw(im, *a, **k)


def gradient_canvas(size, c1, c2, angle):
    w, h = size
    r = math.radians(angle)
    ux, uy = math.cos(r), math.sin(r)
    corners = [(0, 0), (w, 0), (0, h), (w, h)]
    proj = [x * ux + y * uy for x, y in corners]
    lo, hi = min(proj), max(proj)
    ax, ay = corners[proj.index(lo)]
    bx, by = ax + ux * (hi - lo), ay + uy * (hi - lo)
    defs = (f'<linearGradient id="fondo" gradientUnits="userSpaceOnUse" x1="{ax}" y1="{ay}" x2="{bx:.1f}" y2="{by:.1f}">'
            f'<stop offset="0" stop-color="rgb{tuple(c1)}"/><stop offset="1" stop-color="rgb{tuple(c2)}"/></linearGradient>')
    return SvgCanvas(size, (defs, f'<rect id="fondo-rect" width="{w}" height="{h}" fill="url(#fondo)"/>'))


def canvas(size, kind):
    if kind == "brand":
        return gradient_canvas(size, (184, 60, 25), mp.HOT, 120)
    if kind == "dark":
        return gradient_canvas(size, (14, 14, 16), (30, 22, 20), 110)
    w, h = size
    return SvgCanvas(size, ("", f'<rect id="fondo-rect" width="{w}" height="{h}" fill="rgb{tuple(mp.CREAM)}"/>'))


def save(im, name):
    path = os.path.join(mp.OUT, os.path.splitext(name)[0] + ".svg")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(im.to_svg())
    print(os.path.relpath(path, mp.ROOT), f"{os.path.getsize(path) // 1024} KB")


ImageDraw.Draw = draw_proxy
mp.canvas = mt.canvas = canvas
mp.save = save

if __name__ == "__main__":
    mp.OUT = OUT
    mp.p01_gancho()
    mp.paso("1", "Abres.", "Mira qué hay cerca, con fotos y ranks reales.", "feed_black.png", "02_feed_paso1.jpg")
    mp.paso("2", "Eliges.", "Filtra por categoría, precio, comodidades y cómo pagar.", "search_black.png", "03_feed_paso2.jpg")
    mp.paso("3", "Comes.", "Del mapa a la mesa. Y dejas tu rank después.", "map_black.png", "04_feed_paso3.jpg")
    mp.p05_duenos()
    mp.p06_originales()
    mp.p07_fantasma()
    mp.p08_rangos()
    mp.p09_planes()
    mp.s1_gancho()
    mp.s2_duenos()
    mp.s3_encuesta()

    mp.OUT = os.path.join(OUT, "teasers")
    mt.t1_chat()
    mt.t2_cocina()
    mt.t3_debate()
    mt.t4_misterio()
    mt.t5_lo_que_viene()
    mt.t6_no_mas()
    mt.s_cuenta()
    mt.s_encuesta()
