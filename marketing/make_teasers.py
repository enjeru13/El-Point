# -*- coding: utf-8 -*-
"""Piezas de expectativa para comensales (feed 4:5 y stories 9:16).
Correr desde la raíz del repo:  python marketing/make_teasers.py
Reusa el dibujo de make_pack.py (logo, teléfonos, tipografías)."""

import os
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_pack as mp  # noqa: E402
from make_pack import (BRAND, CREAM, DARK2, FEED, HOT, INK, SOFT, STORY, WHITE, canvas, footer, jakarta, logo,
                       outfit, pill, put_phone, text_w)  # noqa: E402

mp.OUT = os.path.join(mp.ROOT, "marketing", "pack", "teasers")
os.makedirs(mp.OUT, exist_ok=True)


def save(im, name):
    mp.save(im, name)


def blurred_phone(im, shot, width, pos, rot=0, radius=14):
    """Teléfono con la captura borrosa: se ve que hay algo, no qué."""
    tmp = tempfile.mkdtemp()
    src = Image.open(os.path.join(mp.SHOTS, shot)).convert("RGB").filter(ImageFilter.GaussianBlur(radius))
    src.save(os.path.join(tmp, "b.png"))
    old = mp.SHOTS
    mp.SHOTS = tmp
    try:
        put_phone(im, "b.png", width, pos, rot)
    finally:
        mp.SHOTS = old


def bubble(im, x, y, who, text, mine=False, maxw=640):
    d = ImageDraw.Draw(im)
    f = jakarta("600SemiBold", 40)
    fn = jakarta("700Bold", 26)
    tw = text_w(d, text, f)
    w = max(tw, text_w(d, who, fn)) + 64
    h = 118 if not mine else 88
    if mine:
        x = FEED[0] - 64 - w
        d.rounded_rectangle((x, y, x + w, y + h), radius=36, fill=BRAND)
        d.text((x + 32, y + 20), text, font=f, fill=WHITE)
    else:
        d.rounded_rectangle((x, y, x + w, y + h), radius=36, fill=WHITE, outline=(230, 216, 208), width=3)
        d.text((x + 32, y + 14), who, font=fn, fill=BRAND)
        d.text((x + 32, y + 54), text, font=f, fill=INK)
    return y + h + 22


def t1_chat():
    im = canvas(FEED, "light")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9)
    d.text((64, 190), "Todos los grupos", font=outfit("800ExtraBold", 76), fill=INK)
    d.text((64, 276), "tienen esta conversación.", font=outfit("800ExtraBold", 76), fill=BRAND)
    y = 440
    y = bubble(im, 64, y, "Caro", "¿dónde comemos?")
    y = bubble(im, 64, y, "Luis", "no sé, tú dime")
    y = bubble(im, 64, y, "Caro", "donde sea")
    y = bubble(im, 64, y, "Pedro", "¿pizza?")
    y = bubble(im, 64, y, "Luis", "pizza no, comimos ayer")
    y = bubble(im, 64, y, "", "...", mine=True)
    d.text((64, 1166), "Se acabó. Muy pronto.", font=outfit("800ExtraBold", 72), fill=INK)
    footer(im)
    save(im, "T1_feed_chat.jpg")


def t2_cocina():
    im = canvas(FEED, "dark")
    # resplandor detrás del pin
    glow = Image.new("RGBA", FEED, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((190, 280, 890, 980), fill=(255, 122, 58, 150))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))
    pin = Image.open(os.path.join(mp.ROOT, "assets/images/logo-pin-dark.png")).convert("RGBA")
    h = 520
    pin = pin.resize((round(pin.width * h / pin.height), h), Image.LANCZOS)
    im.alpha_composite(pin, ((FEED[0] - pin.width) // 2, 330))
    d = ImageDraw.Draw(im)
    f = outfit("800ExtraBold", 96)
    t = "Algo se cocina"
    d.text(((FEED[0] - text_w(d, t, f)) / 2, 100), t, font=f, fill=WHITE)
    t = "en San Cristóbal."
    d.text(((FEED[0] - text_w(d, t, f)) / 2, 206), t, font=f, fill=HOT)
    f2 = jakarta("700Bold", 40)
    t = "Muy pronto en tu iPhone"
    d.text(((FEED[0] - text_w(d, t, f2)) / 2, 1010), t, font=f2, fill=(255, 255, 255, 230))
    logo(im, 395, 1110, 1.0, dark=True)
    footer(im, dark=True)
    save(im, "T2_feed_algo_se_cocina.jpg")


def t3_debate():
    im = canvas(FEED, "brand")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9, dark=True)
    d.text((64, 200), "¿Cuál es la", font=outfit("800ExtraBold", 120), fill=WHITE)
    d.text((64, 330), "mejor arepa", font=outfit("800ExtraBold", 120), fill=INK)
    d.text((64, 460), "de la ciudad?", font=outfit("800ExtraBold", 120), fill=WHITE)
    # dos "bandos"
    for i, (t, sub) in enumerate([("La de siempre", "la del barrio"), ("La nueva", "la que nadie conoce")]):
        x = 64 + i * 484
        d.rounded_rectangle((x, 680, x + 468, 940), radius=40, fill=WHITE if i == 0 else INK)
        d.text((x + 36, 730), t, font=outfit("800ExtraBold", 54), fill=INK if i == 0 else WHITE)
        d.text((x + 36, 810), sub, font=jakarta("600SemiBold", 32), fill=SOFT if i == 0 else (255, 255, 255, 190))
    d.text((64, 1010), "Pronto lo decide la ciudad.", font=outfit("800ExtraBold", 66), fill=WHITE)
    d.text((64, 1100), "Con ranks reales, no con opiniones de internet.", font=jakarta("600SemiBold", 36), fill=(255, 255, 255, 230))
    footer(im, dark=True)
    save(im, "T3_feed_debate_arepa.jpg")


def t4_misterio():
    im = canvas(FEED, "dark")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9, dark=True)
    d.text((64, 190), "¿Qué hay", font=outfit("800ExtraBold", 140), fill=WHITE)
    d.text((64, 336), "aquí?", font=outfit("800ExtraBold", 140), fill=HOT)
    blurred_phone(im, "map_black.png", 430, (580, 480), 5, 16)
    d.text((64, 560), "Pronto lo", font=jakarta("700Bold", 44), fill=(255, 255, 255, 230))
    d.text((64, 616), "descubres.", font=jakarta("700Bold", 44), fill=(255, 255, 255, 230))
    footer(im, dark=True, right=False)
    save(im, "T4_feed_misterio.jpg")


def t5_lo_que_viene():
    im = canvas(FEED, "light")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9)
    d.text((64, 190), "Lo que viene", font=outfit("800ExtraBold", 120), fill=INK)
    d.text((64, 318), "a tu celular.", font=outfit("800ExtraBold", 120), fill=BRAND)
    items = [("Mapa de locales", "qué hay cerca, ahora"), ("Ranks reales", "de gente de aquí"),
             ("Promos", "para no pagar de más"), ("Tus favoritos", "tu lista de siempre")]
    y = 520
    for t, sub in items:
        d.rounded_rectangle((64, y, 1016, y + 160), radius=36, fill=WHITE, outline=(230, 216, 208), width=3)
        d.ellipse((96, y + 40, 176, y + 120), fill=BRAND)
        d.arc((122, y + 52, 150, y + 86), 180, 360, fill=WHITE, width=6)
        d.line((124, y + 70, 124, y + 80), fill=WHITE, width=6)
        d.line((148, y + 70, 148, y + 80), fill=WHITE, width=6)
        d.rounded_rectangle((116, y + 78, 156, y + 106), radius=7, fill=WHITE)
        d.text((212, y + 28), t, font=outfit("800ExtraBold", 54), fill=INK)
        d.text((212, y + 98), sub, font=jakarta("600SemiBold", 32), fill=SOFT)
        y += 180
    footer(im)
    save(im, "T5_feed_lo_que_viene.jpg")


def t6_no_mas():
    im = canvas(FEED, "brand")
    d = ImageDraw.Draw(im)
    logo(im, 64, 56, 0.9, dark=True)
    f = outfit("800ExtraBold", 150)
    d.text((64, 410), "“Donde sea”", font=f, fill=WHITE)
    # tachón
    d.line((40, 535, 1040, 520), fill=INK, width=16)
    d.text((64, 700), "ya no es una opción.", font=outfit("800ExtraBold", 84), fill=INK)
    d.text((64, 820), "Pronto sabrás exactamente dónde.", font=jakarta("700Bold", 44), fill=(255, 255, 255, 240))
    pill(im, 64, 980, "San Cristóbal · Muy pronto", jakarta("700Bold", 34), BRAND, WHITE)
    footer(im, dark=True)
    save(im, "T6_feed_donde_sea.jpg")


def s_cuenta():
    im = canvas(STORY, "dark")
    glow = Image.new("RGBA", STORY, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((140, 520, 940, 1320), fill=(255, 122, 58, 130))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(140)))
    d = ImageDraw.Draw(im)
    logo(im, 64, 150, 1.1, dark=True)
    f = outfit("800ExtraBold", 150)
    d.text((64, 420), "Falta", font=f, fill=WHITE)
    d.text((64, 570), "poco.", font=f, fill=HOT)
    d.rounded_rectangle((64, 900, 1016, 1240), radius=48, outline=(255, 255, 255, 120), width=4)
    d.text((540 - text_w(d, "Aquí va el sticker de", jakarta("600SemiBold", 38)) / 2, 1020), "Aquí va el sticker de",
           font=jakarta("600SemiBold", 38), fill=(255, 255, 255, 180))
    d.text((540 - text_w(d, "cuenta regresiva", jakarta("700Bold", 56)) / 2, 1080), "cuenta regresiva",
           font=jakarta("700Bold", 56), fill=WHITE)
    d.text((64, 1440), "San Cristóbal, ya casi.", font=outfit("800ExtraBold", 72), fill=WHITE)
    d.text((64, 1550), "Activa el aviso para no perdértelo.", font=jakarta("600SemiBold", 40), fill=(255, 255, 255, 210))
    save(im, "T7_story_cuenta_regresiva.jpg")


def s_encuesta():
    im = canvas(STORY, "brand")
    d = ImageDraw.Draw(im)
    logo(im, 64, 150, 1.1, dark=True)
    d.text((64, 400), "¿Quién hace", font=outfit("800ExtraBold", 150), fill=WHITE)
    d.text((64, 546), "la mejor", font=outfit("800ExtraBold", 150), fill=WHITE)
    d.text((64, 692), "pizza?", font=outfit("800ExtraBold", 190), fill=INK)
    d.rounded_rectangle((64, 1000, 1016, 1280), radius=48, outline=(255, 255, 255, 190), width=4)
    t = "Aquí va el sticker de encuesta"
    d.text((540 - text_w(d, t, jakarta("700Bold", 44)) / 2, 1110), t, font=jakarta("700Bold", 44), fill=WHITE)
    d.text((64, 1440), "Responde y lo comparamos pronto", font=outfit("800ExtraBold", 60), fill=INK)
    d.text((64, 1520), "con ranks reales.", font=outfit("800ExtraBold", 60), fill=INK)
    save(im, "T8_story_encuesta_pizza.jpg")


if __name__ == "__main__":
    t1_chat()
    t2_cocina()
    t3_debate()
    t4_misterio()
    t5_lo_que_viene()
    t6_no_mas()
    s_cuenta()
    s_encuesta()
