# -*- coding: utf-8 -*-
"""Piezas cuadradas (1080x1080) para la campaña de IG. Dos ángulos:
comensal (dolor: no saber qué comer) y dueño de local (urgencia: cupos
de Original). Mismos tokens de marca que landing/styles.css y admin-web
(brasa #c8451f -> #e0632f, Outfit display, Plus Jakarta Sans body)."""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math

W = H = 1080

BRAND = (200, 69, 31)      # #c8451f
BRAND2 = (224, 99, 47)     # #e0632f
GOLD = (224, 165, 63)      # #e0a53f
INK = (36, 26, 22)         # #241a16
CREAM = (253, 248, 246)    # #fdf8f6
WHITE = (255, 255, 255)

FONT_DIR_OUTFIT = "../node_modules/@expo-google-fonts/outfit/{w}/Outfit_{w}.ttf"
FONT_DIR_JAKARTA = "../node_modules/@expo-google-fonts/plus-jakarta-sans/{w}/PlusJakartaSans_{w}.ttf"

def outfit(weight, size):
    return ImageFont.truetype(FONT_DIR_OUTFIT.format(w=weight), size)

def jakarta(weight, size):
    return ImageFont.truetype(FONT_DIR_JAKARTA.format(w=weight), size)

def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def diagonal_gradient(size, c1, c2, angle_deg=125):
    """Gradiente diagonal suave (mismo ángulo que .btn-primary en el landing)."""
    w, h = size
    base = Image.new("RGB", (w, h), c1)
    top = Image.new("RGB", (w, h), c2)
    mask = Image.new("L", (w, h))
    md = ImageDraw.Draw(mask)
    rad = math.radians(angle_deg)
    dx, dy = math.cos(rad), math.sin(rad)
    diag = abs(w * dx) + abs(h * dy)
    for y in range(h):
        for x in range(0, w, 4):
            pass
    # Vectorizado por filas para velocidad: proyecta cada pixel sobre el eje del ángulo.
    import numpy as np
    xs = np.arange(w)
    ys = np.arange(h)
    gx, gy = np.meshgrid(xs, ys)
    proj = gx * dx + gy * dy
    proj = (proj - proj.min()) / (proj.max() - proj.min())
    arr = (proj * 255).astype(np.uint8)
    mask = Image.fromarray(arr, mode="L")
    return Image.composite(top, base, mask)

def rounded_rect(draw, box, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def wordmark(draw, x, y, color=WHITE, chip_color=None, scale=1.0):
    """Replica el logo 'el Point•' del landing/app."""
    chip_color = chip_color or color
    f_el = jakarta("700Bold", int(20 * scale))
    f_point = outfit("800ExtraBold", int(34 * scale))
    pad_x, pad_y = int(10 * scale), int(5 * scale)
    el_w = draw.textlength("el", font=f_el)
    chip_h = f_el.size + pad_y * 2
    chip_box = [x, y, x + el_w + pad_x * 2, y + chip_h]
    rounded_rect(draw, chip_box, radius=int(7 * scale), outline=chip_color, width=max(1, int(1.6 * scale)))
    draw.text((x + pad_x, y + pad_y - int(1 * scale)), "el", font=f_el, fill=chip_color)
    px = chip_box[2] + int(7 * scale)
    py = y + chip_h - f_point.size - int(2 * scale)
    draw.text((px, py), "Point", font=f_point, fill=color)
    point_w = draw.textlength("Point", font=f_point)
    dot_r = int(4 * scale)
    dot_cx = px + point_w + int(6 * scale) + dot_r
    dot_cy = chip_box[3] - dot_r - int(1 * scale)
    draw.ellipse([dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r], fill=BRAND if color == WHITE else color)

def wrap_lines(draw, text_lines, font, max_width):
    """text_lines ya viene con saltos manuales -- solo valida que quepan."""
    return text_lines

def draw_multiline(draw, xy, lines, font, fill, line_gap=1.06, align="left", anchor_x=None):
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        bbox = font.getbbox(line) or (0, 0, 0, font.size)
        y += int((bbox[3] - bbox[1] if bbox[3] > bbox[1] else font.size) * line_gap) + int(font.size * (line_gap - 1) * 4)
        y += int(font.size * 0.30)

def pill(draw, cx_left, y, text, font, fg, bg, pad_x=34, pad_y=20):
    tw = draw.textlength(text, font=font)
    th = font.size
    box = [cx_left, y, cx_left + tw + pad_x * 2, y + th + pad_y * 2]
    rounded_rect(draw, box, radius=(box[3] - box[1]) // 2, fill=bg)
    draw.text((cx_left + pad_x, y + pad_y - 2), text, font=font, fill=fg)
    return box

# ─────────────────────────────────────────────────────────────────────────
# POST 1 — Comensales: el dolor de "¿qué comemos hoy?"
# ─────────────────────────────────────────────────────────────────────────

def build_post_comensal():
    img = diagonal_gradient((W, H), BRAND, BRAND2, angle_deg=125)
    draw = ImageDraw.Draw(img)

    # Viñeta inferior para que el CTA respire sobre fondo más oscuro.
    vign = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vign)
    vd.rectangle([0, H - 420, W, H], fill=90)
    vign = vign.filter(ImageFilter.GaussianBlur(120))
    dark = Image.new("RGB", (W, H), (20, 10, 5))
    img = Image.composite(dark, img, vign)
    draw = ImageDraw.Draw(img)

    wordmark(draw, 64, 56, color=WHITE, scale=1.0)

    f_eyebrow = jakarta("700Bold", 26)
    draw.text((64, 168), "TODOS LOS DÍAS LA MISMA PREGUNTA", font=f_eyebrow, fill=(255, 235, 225))

    f_h1 = outfit("800ExtraBold", 118)
    draw_multiline(draw, (60, 226), ["¿Qué comemos", "hoy?"], f_h1, WHITE, line_gap=1.0)

    f_sub = jakarta("600SemiBold", 40)
    draw_multiline(draw, (64, 578), ["Y otra vez nadie sabe qué responder."], f_sub, (255, 240, 232))

    f_payoff = jakarta("500Medium", 32)
    payoff_lines = ["El Point te muestra qué hay cerca,", "abierto y bueno para comer — ahorita."]
    draw_multiline(draw, (64, 656), payoff_lines, f_payoff, (255, 255, 255), line_gap=1.15)

    # Ícono real de la app, esquina inferior derecha del bloque de texto.
    icon = Image.open("../assets/images/icon.png").convert("RGBA").resize((150, 150), Image.LANCZOS)
    mask = Image.new("L", icon.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, 150, 150], radius=38, fill=255)
    icon_shadow_box = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    cta_y = 800
    f_cta = outfit("700Bold", 34)
    pill(draw, 64, cta_y, "Descárgala gratis", f_cta, BRAND, WHITE, pad_x=40, pad_y=24)

    img.paste(icon, (W - 150 - 64, cta_y - 6), mask)

    f_caption = jakarta("500Medium", 26)
    draw.text((64, cta_y + 100), "Muy pronto en Google Play y App Store", font=f_caption, fill=(255, 226, 214))

    img.save("post_comensal.png")


# ─────────────────────────────────────────────────────────────────────────
# POST 2 — Dueños de locales: urgencia por cupos de Original
# ─────────────────────────────────────────────────────────────────────────

def build_post_dueno():
    img = diagonal_gradient((W, H), BRAND2, BRAND, angle_deg=125)
    draw = ImageDraw.Draw(img)

    vign = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vign)
    vd.rectangle([0, H - 460, W, H], fill=95)
    vign = vign.filter(ImageFilter.GaussianBlur(120))
    dark = Image.new("RGB", (W, H), (20, 10, 5))
    img = Image.composite(dark, img, vign)
    draw = ImageDraw.Draw(img)

    wordmark(draw, 64, 56, color=WHITE, scale=1.0)

    # Sello dorado "100 cupos" arriba a la derecha, ligeramente rotado.
    seal = Image.new("RGBA", (300, 300), (0, 0, 0, 0))
    sd = ImageDraw.Draw(seal)
    sd.ellipse([10, 10, 290, 290], fill=GOLD)
    sd.ellipse([26, 26, 274, 274], outline=(255, 255, 255, 180), width=3)
    f_seal_num = outfit("800ExtraBold", 96)
    f_seal_txt = jakarta("700Bold", 24)
    num = "100"
    nw = sd.textlength(num, font=f_seal_num)
    sd.text(((300 - nw) / 2, 88), num, font=f_seal_num, fill=INK)
    txt = "ORIGINALES"
    tw = sd.textlength(txt, font=f_seal_txt)
    sd.text(((300 - tw) / 2, 192), txt, font=f_seal_txt, fill=INK)
    seal = seal.rotate(10, resample=Image.BICUBIC, expand=True)
    img.paste(seal, (W - seal.width + 40, -30), seal)

    f_eyebrow = jakarta("700Bold", 26)
    draw.text((64, 168), "PRIMEROS 100 LOCALES DE SAN CRISTÓBAL", font=f_eyebrow, fill=(255, 235, 225))

    f_h1 = outfit("800ExtraBold", 108)
    draw_multiline(draw, (60, 226), ["Sé Original.", "Gratis para", "siempre."], f_h1, WHITE, line_gap=1.0)

    f_item = jakarta("600SemiBold", 33)
    items = [
        "Cero mensualidad — para siempre, no una promo",
        "Insignia permanente de Original en tu perfil",
        "Prioridad para salir primero en el mapa",
    ]
    y = 640
    for it in items:
        r = 6
        draw.ellipse([64, y + 12, 64 + r * 2, y + 12 + r * 2], fill=WHITE)
        draw.text((64 + r * 2 + 16, y), it, font=f_item, fill=(255, 245, 240))
        y += 52

    cta_y = 870
    f_cta = outfit("700Bold", 34)
    pill(draw, 64, cta_y, "Regístrate ya", f_cta, BRAND, WHITE, pad_x=40, pad_y=24)

    f_caption = jakarta("500Medium", 26)
    draw.text((64, cta_y + 100), "Cupos limitados — se acaban con el tiempo, no por sorteo", font=f_caption, fill=(255, 226, 214))

    img.save("post_dueno.png")


if __name__ == "__main__":
    build_post_comensal()
    build_post_dueno()
    print("done")
