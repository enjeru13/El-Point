# -*- coding: utf-8 -*-
"""Lote de piezas para Instagram (feed 1080x1350 y stories 1080x1920).
Correr desde la raíz del repo:  python marketing/make_pack.py
Usa las capturas reales de marketing/shots-src, el logo nuevo y las tipografías
de la marca (Outfit + Plus Jakarta Sans). Todo el texto está arriba de cada
función para cambiarlo sin tocar el dibujo."""

import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "marketing", "pack")
SHOTS = os.path.join(ROOT, "marketing", "shots-src")
os.makedirs(OUT, exist_ok=True)

FEED = (1080, 1350)
STORY = (1080, 1920)

BRAND = (200, 69, 31)
BRAND2 = (224, 99, 47)
HOT = (255, 122, 58)
INK = (36, 26, 22)
CREAM = (253, 248, 246)
DARK = (11, 11, 13)
DARK2 = (24, 24, 28)
WHITE = (255, 255, 255)
SOFT = (107, 91, 82)

URL = "elpoint-app.netlify.app"
WA = "+58 414 979 7876"


def outfit(w, s):
    return ImageFont.truetype(os.path.join(ROOT, f"node_modules/@expo-google-fonts/outfit/{w}/Outfit_{w}.ttf"), s)


def jakarta(w, s):
    return ImageFont.truetype(
        os.path.join(ROOT, f"node_modules/@expo-google-fonts/plus-jakarta-sans/{w}/PlusJakartaSans_{w}.ttf"), s
    )


def grad(size, c1, c2, angle=125):
    w, h = size
    gx, gy = np.meshgrid(np.arange(w), np.arange(h))
    r = math.radians(angle)
    p = gx * math.cos(r) + gy * math.sin(r)
    p = (p - p.min()) / (p.max() - p.min())
    a = np.array(c1, dtype=float)
    b = np.array(c2, dtype=float)
    arr = (a[None, None, :] * (1 - p[..., None]) + b[None, None, :] * p[..., None]).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def canvas(size, kind):
    if kind == "brand":
        return grad(size, (184, 60, 25), HOT, 120).convert("RGBA")
    if kind == "dark":
        return grad(size, (14, 14, 16), (30, 22, 20), 110).convert("RGBA")
    return Image.new("RGBA", size, CREAM + (255,))


def text_w(d, t, f):
    return d.textlength(t, font=f)


def wrap(d, t, f, max_w):
    lines, cur = [], ""
    for word in t.split():
        trial = (cur + " " + word).strip()
        if text_w(d, trial, f) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def block(d, t, f, x, y, max_w, fill, lh=1.12, align="left"):
    for ln in wrap(d, t, f, max_w):
        tx = x if align == "left" else x + (max_w - text_w(d, ln, f)) / 2
        d.text((tx, y), ln, font=f, fill=fill)
        y += int(f.size * lh)
    return y


def shadow(img, layer, pos, blur=36, off=(0, 28), alpha=120):
    sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    sh.putalpha(layer.split()[3].point(lambda v: min(v, alpha)))
    pad = blur * 3
    big = Image.new("RGBA", (layer.width + pad * 2, layer.height + pad * 2), (0, 0, 0, 0))
    big.paste(sh, (pad, pad))
    big = big.filter(ImageFilter.GaussianBlur(blur))
    black = Image.new("RGBA", big.size, (0, 0, 0, 255))
    black.putalpha(big.split()[3])
    img.alpha_composite(black, (int(pos[0] - pad + off[0]), int(pos[1] - pad + off[1])))


def phone(shot, width, rot=0):
    """Teléfono con bisel oscuro; `shot` es el nombre del PNG en shots-src."""
    k = 2
    w = width * k
    pad = int(w * 0.03)
    src = Image.open(os.path.join(SHOTS, shot)).convert("RGB")
    inner_w = w - pad * 2
    inner_h = round(src.height * inner_w / src.width)
    scr = src.resize((inner_w, inner_h), Image.LANCZOS)
    rin = int(w * 0.135)
    m = Image.new("L", scr.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, inner_w - 1, inner_h - 1), rin, fill=255)
    body = Image.new("RGBA", (w, inner_h + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(body).rounded_rectangle((0, 0, w - 1, body.height - 1), rin + pad, fill=(16, 16, 18, 255),
                                           outline=(70, 70, 76, 255), width=3)
    body.paste(scr, (pad, pad), m)
    body = body.resize((width, round(body.height / k)), Image.LANCZOS)
    if rot:
        body = body.rotate(rot, resample=Image.BICUBIC, expand=True)
    return body


def put_phone(img, shot, width, pos, rot=0):
    ph = phone(shot, width, rot)
    shadow(img, ph, pos)
    img.alpha_composite(ph, (int(pos[0]), int(pos[1])))


def logo(img, x, y, scale=1.0, dark=False):
    d = ImageDraw.Draw(img)
    fe, fp = outfit("700Bold", int(30 * scale)), outfit("800ExtraBold", int(60 * scale))
    col = WHITE if dark else INK
    sub = (255, 255, 255, 170) if dark else SOFT
    d.text((x, y + 24 * scale), "el", font=fe, fill=sub)
    xe = x + text_w(d, "el", fe) + 12 * scale
    d.text((xe, y), "Point", font=fp, fill=col)
    xp = xe + text_w(d, "Point", fp) + 10 * scale
    pin = Image.open(os.path.join(ROOT, "assets/images/logo-pin-dark.png" if dark else "assets/images/logo-pin.png")).convert("RGBA")
    ph = int(66 * scale)
    pin = pin.resize((round(pin.width * ph / pin.height), ph), Image.LANCZOS)
    img.alpha_composite(pin, (int(xp), int(y + 4 * scale)))


def pill(img, x, y, t, f, fg, bg, padx=28, pady=14, outline=None):
    d = ImageDraw.Draw(img)
    w = text_w(d, t, f) + padx * 2
    h = f.size + pady * 2
    d.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=bg, outline=outline, width=3 if outline else 0)
    d.text((x + padx, y + pady - 2), t, font=f, fill=fg)
    return w, h


def footer(img, dark=False, y=None, right=True):
    d = ImageDraw.Draw(img)
    f = jakarta("600SemiBold", 28)
    y = y or img.height - 78
    d.text((64, y), URL, font=f, fill=(255, 255, 255, 200) if dark else SOFT)
    t = "San Cristóbal · Táchira"
    if right:
        d.text((img.width - 64 - text_w(d, t, f), y), t, font=f, fill=(255, 255, 255, 200) if dark else SOFT)


def save(img, name):
    p = os.path.join(OUT, name)
    img.convert("RGB").save(p, quality=95)
    print(name)


# ── piezas ──────────────────────────────────────────────────────────────────

def p01_gancho():
    im = canvas(FEED, "brand")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 1.0, dark=True)
    d.text((64, 190), "Deja de preguntar", font=outfit("800ExtraBold", 108), fill=WHITE)
    d.text((64, 306), "¿dónde comemos?", font=outfit("800ExtraBold", 108), fill=INK)
    block(d, "Ranks reales. Fotos reales. Cero publicidad.", jakarta("600SemiBold", 38), 64, 450, 950, (255, 255, 255, 235))
    put_phone(im, "feed_black.png", 400, (110, 650), -6)
    put_phone(im, "map_black.png", 400, (560, 600), 5)
    pill(im, 64, 540, "Muy pronto en App Store", jakarta("700Bold", 28), BRAND, WHITE)
    save(im, "01_feed_gancho.jpg")


def paso(n, title, sub, shot, name):
    im = canvas(FEED, "light")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9)
    d.ellipse((64, 200, 184, 320), fill=BRAND)
    f = outfit("800ExtraBold", 78)
    d.text((124 - text_w(d, n, f) / 2, 214), n, font=f, fill=WHITE)
    d.text((64, 350), title, font=outfit("800ExtraBold", 150), fill=INK)
    block(d, sub, jakarta("600SemiBold", 40), 64, 530, 520, SOFT)
    put_phone(im, shot, 440, (590, 330), 4)
    footer(im, right=False)
    save(im, name)


def p05_duenos():
    im = canvas(FEED, "dark")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9, dark=True)
    d.text((64, 190), "Que te", font=outfit("800ExtraBold", 130), fill=WHITE)
    d.text((64, 320), "encuentren", font=outfit("800ExtraBold", 130), fill=WHITE)
    d.text((64, 450), "primero.", font=outfit("800ExtraBold", 130), fill=HOT)
    block(d, "Tu local en el mapa de San Cristóbal, con visitas y toques a WhatsApp que puedes medir.",
          jakarta("600SemiBold", 38), 64, 620, 880, (255, 255, 255, 215))
    stats = [("Visitas", "128"), ("WhatsApp", "34"), ("Cómo llegar", "19")]
    x = 64
    for lab, val in stats:
        d.rounded_rectangle((x, 850, x + 290, 1090), radius=32, fill=DARK2, outline=(70, 70, 78), width=2)
        d.text((x + 28, 872), val, font=outfit("800ExtraBold", 96), fill=WHITE)
        d.text((x + 28, 1000), lab, font=jakarta("600SemiBold", 30), fill=(255, 255, 255, 190))
        x += 316
    d.text((64, 1118), "Cifras de ejemplo", font=jakarta("600SemiBold", 24), fill=(255, 255, 255, 120))
    pill(im, 64, 1180, "3 meses gratis para probar", jakarta("700Bold", 32), WHITE, BRAND)
    footer(im, dark=True)
    save(im, "05_feed_duenos.jpg")


def p06_originales():
    im = canvas(FEED, "brand")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9, dark=True)
    f = outfit("800ExtraBold", 560)
    d.text((54, 170), "100", font=f, fill=WHITE)
    d.text((64, 790), "locales Originales", font=outfit("800ExtraBold", 96), fill=INK)
    block(d, "Los primeros 100 locales que entren a El Point son gratis para siempre.", jakarta("600SemiBold", 42), 64, 930, 900, (255, 255, 255, 240))
    pill(im, 64, 1130, "Registra tu local desde la app", jakarta("700Bold", 32), BRAND, WHITE)
    footer(im, dark=True)
    save(im, "06_feed_originales.jpg")


def ghost(d, cx, cy, s, fill, eye):
    r = s // 2
    d.pieslice((cx - r, cy - r, cx + r, cy + r), 180, 360, fill=fill)
    d.rectangle((cx - r, cy, cx + r, cy + int(s * 0.62)), fill=fill)
    base = cy + int(s * 0.62)
    n = 3
    br = r / n
    for k in range(n):
        bx = cx - r + br + k * 2 * br
        d.ellipse((bx - br, base - br, bx + br, base + br), fill=fill)
    for ex in (-0.22, 0.22):
        d.ellipse((cx + ex * s - s * 0.07, cy - s * 0.08, cx + ex * s + s * 0.07, cy + s * 0.06), fill=eye)


def p07_fantasma():
    im = canvas(FEED, "dark")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9, dark=True)
    ghost(d, 540, 400, 380, HOT, DARK)
    d.text((64, 700), "Sin local,", font=outfit("800ExtraBold", 124), fill=WHITE)
    d.text((64, 830), "con clientes.", font=outfit("800ExtraBold", 124), fill=HOT)
    block(d, "Registra tu cocina fantasma: solo delivery o pickup, con zona aproximada en lugar de dirección.",
          jakarta("600SemiBold", 36), 64, 1000, 900, (255, 255, 255, 215))
    footer(im, dark=True)
    save(im, "07_feed_cocina_fantasma.jpg")


def p08_rangos():
    im = canvas(FEED, "light")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9)
    d.text((64, 190), "Rankear", font=outfit("800ExtraBold", 120), fill=INK)
    d.text((64, 316), "tiene premio.", font=outfit("800ExtraBold", 120), fill=BRAND)
    ranks = [("Novato", "Nivel 1–3"), ("Comensal", "4–8"), ("Explorador", "9–15"),
             ("Crítico Local", "16–24"), ("Gurú Gastronómico", "25–34"), ("Leyenda", "35+")]
    y0 = 520
    d.line((118, y0 + 20, 118, y0 + 20 + 100 * 5), fill=BRAND, width=6)
    for i, (n, lv) in enumerate(ranks):
        y = y0 + i * 100
        last = i == len(ranks) - 1
        d.ellipse((98, y, 138, y + 40), fill=BRAND if last else CREAM, outline=BRAND, width=8)
        d.text((176, y - 8), n, font=outfit("800ExtraBold" if last else "700Bold", 52), fill=INK)
        d.text((176 + text_w(d, n, outfit("800ExtraBold" if last else "700Bold", 52)) + 24, y + 6), lv,
               font=jakarta("600SemiBold", 32), fill=SOFT)
    footer(im)
    save(im, "08_feed_rangos.jpg")


def p09_planes():
    im = canvas(FEED, "light")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9)
    d.text((64, 190), "3 meses gratis.", font=outfit("800ExtraBold", 110), fill=INK)
    d.text((64, 310), "Luego, tú eliges.", font=outfit("800ExtraBold", 110), fill=BRAND)
    plans = [("Mensual", "US$3", "al mes", False), ("Trimestral", "US$7", "cada 3 meses", False), ("Anual", "US$18", "al año", True)]
    x = 64
    for name, price, per, best in plans:
        w = 290
        d.rounded_rectangle((x, 520, x + w, 940), radius=36, fill=WHITE, outline=BRAND if best else (230, 216, 208), width=6 if best else 3)
        if best:
            pill(im, x + 24, 490, "Mejor precio", jakarta("700Bold", 24), WHITE, BRAND, padx=20, pady=8)
        d.text((x + 28, 560), name, font=outfit("700Bold", 44), fill=INK)
        d.text((x + 28, 660), price, font=outfit("800ExtraBold", 74), fill=BRAND)
        d.text((x + 28, 770), per, font=jakarta("600SemiBold", 30), fill=SOFT)
        x += w + 28
    block(d, "Pago móvil, Binance, Bancolombia, Nequi o Davivienda. Escríbenos por WhatsApp.", jakarta("600SemiBold", 36), 64, 1000, 900, SOFT)
    pill(im, 64, 1150, f"WhatsApp {WA}", jakarta("700Bold", 34), WHITE, BRAND)
    save(im, "09_feed_planes.jpg")


def s1_gancho():
    im = canvas(STORY, "brand")
    d = ImageDraw.Draw(im)
    logo(im, 64, 150, 1.1, dark=True)
    d.text((64, 330), "Deja de", font=outfit("800ExtraBold", 150), fill=WHITE)
    d.text((64, 476), "preguntar", font=outfit("800ExtraBold", 150), fill=WHITE)
    d.text((64, 622), "¿dónde", font=outfit("800ExtraBold", 150), fill=INK)
    d.text((64, 768), "comemos?", font=outfit("800ExtraBold", 150), fill=INK)
    put_phone(im, "map_black.png", 520, (460, 1000), 5)
    put_phone(im, "feed_black.png", 420, (60, 1180), -6)
    pill(im, 64, 960, "Muy pronto en App Store", jakarta("700Bold", 30), BRAND, WHITE)
    save(im, "10_story_gancho.jpg")


def s2_duenos():
    im = canvas(STORY, "dark")
    d = ImageDraw.Draw(im)
    logo(im, 64, 150, 1.1, dark=True)
    d.text((64, 420), "¿Tienes", font=outfit("800ExtraBold", 170), fill=WHITE)
    d.text((64, 580), "un local?", font=outfit("800ExtraBold", 170), fill=HOT)
    block(d, "Regístralo y pruébalo 3 meses gratis. Los primeros 100 son gratis para siempre.",
          jakarta("600SemiBold", 48), 64, 840, 900, (255, 255, 255, 220))
    for i, t in enumerate(["Perfil con fotos y menú", "Métricas: quién te ve", "Destacado con tu plan"]):
        y = 1160 + i * 104
        d.ellipse((64, y + 8, 112, y + 56), fill=BRAND)
        d.line([(78, y + 34), (86, y + 43), (100, y + 24)], fill=WHITE, width=6, joint="curve")
        d.text((140, y + 6), t, font=jakarta("700Bold", 44), fill=WHITE)
    pill(im, 64, 1560, f"WhatsApp {WA}", jakarta("700Bold", 42), WHITE, BRAND, padx=40, pady=22)
    save(im, "11_story_duenos.jpg")


def s3_encuesta():
    im = canvas(STORY, "light")
    d = ImageDraw.Draw(im)
    logo(im, 64, 150, 1.1)
    d.text((64, 380), "¿Qué se", font=outfit("800ExtraBold", 190), fill=INK)
    d.text((64, 556), "come hoy?", font=outfit("800ExtraBold", 190), fill=BRAND)
    block(d, "Vota y te decimos dónde. (Pon aquí el sticker de encuesta de Instagram)", jakarta("600SemiBold", 42), 64, 800, 900, SOFT)
    chips = ["Arepas", "Pizza", "Pollo broaster", "Parrilla", "Sushi", "Hamburguesa"]
    x, y = 64, 1000
    f = outfit("700Bold", 56)
    for c in chips:
        w = text_w(d, c, f) + 70
        if x + w > 1016:
            x, y = 64, y + 120
        d.rounded_rectangle((x, y, x + w, y + 96), radius=48, fill=WHITE, outline=(230, 216, 208), width=3)
        d.text((x + 35, y + 14), c, font=f, fill=INK)
        x += w + 20
    save(im, "12_story_encuesta.jpg")


if __name__ == "__main__":
    p01_gancho()
    paso("1", "Abres.", "Mira qué hay cerca, con fotos y ranks reales.", "feed_black.png", "02_feed_paso1.jpg")
    paso("2", "Eliges.", "Filtra por categoría, precio, comodidades y cómo pagar.", "search_black.png", "03_feed_paso2.jpg")
    paso("3", "Comes.", "Del mapa a la mesa. Y dejas tu rank después.", "map_black.png", "04_feed_paso3.jpg")
    p05_duenos()
    p06_originales()
    p07_fantasma()
    p08_rangos()
    p09_planes()
    s1_gancho()
    s2_duenos()
    s3_encuesta()
