# -*- coding: utf-8 -*-
"""Piezas de lanzamiento: El Point ya está en el App Store (noviembre 2026).
Correr desde la raíz del repo:  python marketing/make_launch.py
Responden a los teasers (T1 el chat, T2 "Algo se cocina") y reusan el dibujo
de make_pack.py. Todo el texto está dentro de cada función."""

import os
import sys

import fitz  # PyMuPDF: convierte el distintivo oficial (SVG) a imagen
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_pack as mp  # noqa: E402
from make_pack import (BRAND, CREAM, DARK2, FEED, HOT, INK, SOFT, STORY, WHITE, block, canvas, footer, jakarta,
                       logo, outfit, pill, put_phone, text_w)  # noqa: E402
from make_teasers import bubble  # noqa: E402

mp.OUT = os.path.join(mp.ROOT, "marketing", "pack", "lanzamiento")
os.makedirs(mp.OUT, exist_ok=True)

WA = mp.WA


def badge(height, white=False):
    """Distintivo oficial "Descárgalo en el App Store" (el de la página web)."""
    name = "appstore-es-white.svg" if white else "appstore-es.svg"
    doc = fitz.open(os.path.join(mp.ROOT, "landing", "assets", name))
    pix = doc[0].get_pixmap(dpi=600, alpha=True)
    im = Image.frombytes("RGBA", (pix.width, pix.height), pix.samples)
    return im.resize((round(im.width * height / im.height), height), Image.LANCZOS)


def put_badge(im, x, y, height, white=False):
    b = badge(height, white)
    im.alpha_composite(b, (int(x), int(y)))
    return b.width


def center(d, t, f, y, fill, w=FEED[0]):
    d.text(((w - text_w(d, t, f)) / 2, y), t, font=f, fill=fill)


def glow(im, box, color=(255, 122, 58, 150), blur=120):
    g = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse(box, fill=color)
    im.alpha_composite(g.filter(ImageFilter.GaussianBlur(blur)))


def save(im, name):
    mp.save(im, name)


# ── Feed 1080x1350 ──────────────────────────────────────────────────────────

def l01_ya_se_cocino():
    """Respuesta al teaser T2: el mismo pin, ahora encendido."""
    im = canvas(FEED, "dark")
    glow(im, (140, 260, 940, 1060), (255, 122, 58, 190), 130)
    pin = Image.open(os.path.join(mp.ROOT, "assets/images/logo-pin-dark.png")).convert("RGBA")
    h = 500
    pin = pin.resize((round(pin.width * h / pin.height), h), Image.LANCZOS)
    im.alpha_composite(pin, ((FEED[0] - pin.width) // 2, 350))
    d = ImageDraw.Draw(im)
    f = outfit("800ExtraBold", 104)
    center(d, "Ya se cocinó.", f, 100, WHITE)
    center(d, "Y está listo.", f, 214, HOT)
    center(d, "El Point ya está en el App Store", jakarta("700Bold", 40), 930, (255, 255, 255, 235))
    bw = badge(96, white=True).width
    put_badge(im, (FEED[0] - bw) / 2, 1010, 96, white=True)
    footer(im, dark=True)
    save(im, "L01_feed_ya_se_cocino.jpg")


def l02_chat():
    """Respuesta al teaser T1: el mismo chat, con final."""
    im = canvas(FEED, "light")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9)
    d.text((64, 190), "Esta conversación", font=outfit("800ExtraBold", 76), fill=INK)
    d.text((64, 276), "por fin tiene final.", font=outfit("800ExtraBold", 76), fill=BRAND)
    y = 430
    y = bubble(im, 64, y, "Caro", "¿dónde comemos?")
    y = bubble(im, 64, y, "Luis", "no sé, tú dime")
    y = bubble(im, 64, y, "Pedro", "¿pizza?")
    y = bubble(im, 64, y, "Luis", "pizza no, comimos ayer")
    y = bubble(im, 64, y, "", "ya lo vi en El Point, vamos", mine=True)
    d.text((64, 1100), "Bájala gratis.", font=outfit("800ExtraBold", 72), fill=INK)
    put_badge(im, 64, 1190, 74)
    d.text((64 + badge(74).width + 28, 1210), "iPhone y iPad", font=jakarta("700Bold", 32), fill=SOFT)
    save(im, "L02_feed_chat_final.jpg")


def l03_ya_tiene_app():
    """La pieza principal: la pregunta de siempre, ahora con app."""
    im = canvas(FEED, "brand")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 1.0, dark=True)
    d.text((64, 196), "¿Dónde comemos?", font=outfit("800ExtraBold", 102), fill=WHITE)
    d.text((64, 310), "Ya tiene app.", font=outfit("800ExtraBold", 112), fill=INK)
    block(d, "Qué está abierto, qué te queda cerca y cuánto cuesta. Gratis y sin publicidad.",
          jakarta("600SemiBold", 38), 64, 450, 940, (255, 255, 255, 235))
    put_phone(im, "feed_black.png", 400, (110, 700), -6)
    put_phone(im, "map_black.png", 400, (560, 650), 5)
    put_badge(im, 64, 575, 84)
    save(im, "L03_feed_ya_tiene_app.jpg")


def l04_buscala():
    """Cómo encontrarla: el buscador del App Store dibujado (no es captura real)."""
    im = canvas(FEED, "light")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9)
    d.text((64, 190), "Búscala así", font=outfit("800ExtraBold", 110), fill=INK)
    d.text((64, 308), "en el App Store.", font=outfit("800ExtraBold", 110), fill=BRAND)
    # buscador
    d.rounded_rectangle((64, 500, 1016, 610), radius=30, fill=WHITE, outline=(230, 216, 208), width=3)
    d.ellipse((104, 532, 144, 572), outline=SOFT, width=6)
    d.line((140, 568, 158, 586), fill=SOFT, width=7)
    d.text((184, 525), "el point", font=jakarta("600SemiBold", 46), fill=INK)
    d.line((364, 528, 364, 584), fill=BRAND, width=4)  # cursor
    # resultado
    d.rounded_rectangle((64, 650, 1016, 900), radius=40, fill=WHITE, outline=(230, 216, 208), width=3)
    icon = Image.open(os.path.join(mp.ROOT, "marketing/figma/logo/icono-app-1024.png")).convert("RGBA")
    icon = icon.resize((170, 170), Image.LANCZOS)
    m = Image.new("L", icon.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, 169, 169), 40, fill=255)
    im.paste(icon, (100, 690), m)
    d.text((300, 700), "El Point", font=outfit("800ExtraBold", 60), fill=INK)
    d.text((300, 778), "Dónde comer en San Cristóbal", font=jakarta("600SemiBold", 30), fill=SOFT)
    pill(im, 300, 826, "Obtener", jakarta("800ExtraBold", 30), WHITE, BRAND, padx=34, pady=8)
    for i, t in enumerate(["Gratis, sin publicidad", "Para iPhone y iPad", "Android: viene después"]):
        y = 980 + i * 76
        d.ellipse((64, y + 6, 104, y + 46), fill=BRAND)
        d.line([(76, y + 27), (83, y + 35), (95, y + 18)], fill=WHITE, width=5, joint="curve")
        d.text((128, y), t, font=jakarta("700Bold", 40), fill=INK)
    footer(im, right=False)
    save(im, "L04_feed_buscala.jpg")


def l05_novato():
    """Todos arrancan de cero: la carrera a Leyenda empieza hoy."""
    im = canvas(FEED, "dark")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9, dark=True)
    d.text((64, 190), "Hoy todos", font=outfit("800ExtraBold", 116), fill=WHITE)
    d.text((64, 310), "somos Novatos.", font=outfit("800ExtraBold", 116), fill=HOT)
    block(d, "¿Quién será la primera Leyenda de San Cristóbal? Cada rank que dejas suma XP.",
          jakarta("600SemiBold", 38), 64, 470, 940, (255, 255, 255, 215))
    ranks = ["Novato", "Comensal", "Explorador", "Crítico Local", "Gurú Gastronómico", "Leyenda"]
    y0 = 680
    d.line((118, y0 + 20, 118, y0 + 20 + 92 * 5), fill=(90, 70, 62), width=6)
    for i, n in enumerate(ranks):
        y = y0 + i * 92
        first, last = i == 0, i == len(ranks) - 1
        if first:
            d.ellipse((96, y - 2, 140, y + 42), fill=HOT)
        else:
            d.ellipse((98, y, 138, y + 40), fill=DARK2, outline=(255, 122, 58, 255) if last else (90, 70, 62), width=6)
        f = outfit("800ExtraBold" if first or last else "700Bold", 50)
        col = WHITE if first else ((255, 255, 255, 235) if last else (255, 255, 255, 110))
        d.text((176, y - 10), n, font=f, fill=col)
        if first:
            pill(im, 176 + text_w(d, n, f) + 26, y - 6, "Tú estás aquí", jakarta("700Bold", 26), WHITE, BRAND, padx=20, pady=8)
        if last:
            d.text((176 + text_w(d, n, f) + 24, y + 2), "¿Quién llega primero?", font=jakarta("700Bold", 30), fill=HOT)
    footer(im, dark=True)
    save(im, "L05_feed_todos_novatos.jpg")


def l06_originales():
    """Para dueños: los 100 cupos de Originales arrancan en cero."""
    im = canvas(FEED, "brand")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9, dark=True)
    d.text((64, 180), "Quedan", font=outfit("800ExtraBold", 96), fill=WHITE)
    d.text((54, 260), "100", font=outfit("800ExtraBold", 470), fill=WHITE)
    d.text((64, 790), "cupos Originales.", font=outfit("800ExtraBold", 92), fill=INK)
    block(d, "Los primeros 100 locales aprobados en El Point tienen el perfil completo gratis para siempre: menú, fotos, WhatsApp y métricas.",
          jakarta("600SemiBold", 38), 64, 920, 940, (255, 255, 255, 240))
    pill(im, 64, 1140, "Registra tu local desde la app", jakarta("700Bold", 32), BRAND, WHITE)
    footer(im, dark=True)
    save(im, "L06_feed_100_originales.jpg")


# ── Stories 1080x1920 ───────────────────────────────────────────────────────

def s1_ya_esta():
    im = canvas(STORY, "brand")
    d = ImageDraw.Draw(im)
    logo(im, 64, 150, 1.1, dark=True)
    for i, (t, c) in enumerate([("Ya está", WHITE), ("en el", WHITE), ("App Store.", INK)]):
        d.text((64, 330 + i * 150), t, font=outfit("800ExtraBold", 156), fill=c)
    block(d, "Gratis, para iPhone y iPad.", jakarta("700Bold", 48), 64, 820, 900, (255, 255, 255, 235))
    put_phone(im, "map_black.png", 470, (520, 1060), 5)
    put_phone(im, "feed_black.png", 420, (70, 1180), -6)
    # zona para el sticker de enlace de Instagram
    d.rounded_rectangle((64, 920, 640, 1040), radius=60, outline=WHITE, width=4)
    d.text((104, 956), "Sticker de enlace aquí", font=jakarta("700Bold", 36), fill=WHITE)
    save(im, "S1_story_ya_esta.jpg")


def s2_encuesta():
    im = canvas(STORY, "light")
    d = ImageDraw.Draw(im)
    logo(im, 64, 150, 1.1)
    d.text((64, 380), "¿Ya la", font=outfit("800ExtraBold", 190), fill=INK)
    d.text((64, 570), "bajaste?", font=outfit("800ExtraBold", 190), fill=BRAND)
    block(d, "Pon aquí el sticker de encuesta: \"Sí, ya la tengo\" / \"Ahorita mismo\".",
          jakarta("600SemiBold", 42), 64, 830, 900, SOFT)
    d.rounded_rectangle((64, 1020, 1016, 1300), radius=40, outline=(230, 216, 208), width=4)
    center(d, "Encuesta", jakarta("700Bold", 40), 1136, (200, 190, 184), STORY[0])
    put_badge(im, 64, 1560, 110)
    save(im, "S2_story_encuesta.jpg")


def s3_android():
    im = canvas(STORY, "dark")
    d = ImageDraw.Draw(im)
    logo(im, 64, 150, 1.1, dark=True)
    d.text((64, 420), "¿Tienes", font=outfit("800ExtraBold", 170), fill=WHITE)
    d.text((64, 610), "Android?", font=outfit("800ExtraBold", 170), fill=HOT)
    block(d, "Viene después, palabra. Escríbenos y eres de los primeros en saber cuándo sale.",
          jakarta("600SemiBold", 48), 64, 840, 900, (255, 255, 255, 220))
    block(d, "Mientras tanto, pásale el dato a tu pana con iPhone.", jakarta("700Bold", 46), 64, 1130, 900, WHITE)
    pill(im, 64, 1560, f"WhatsApp {WA}", jakarta("700Bold", 42), WHITE, BRAND, padx=40, pady=22)
    save(im, "S3_story_android.jpg")


if __name__ == "__main__":
    l01_ya_se_cocino()
    l02_chat()
    l03_ya_tiene_app()
    l04_buscala()
    l05_novato()
    l06_originales()
    s1_ya_esta()
    s2_encuesta()
    s3_android()
