# Capturas para Google Play (1080x1920, 9:16) a partir de las de iPhone.
# Play no acepta proporciones mayores a 2:1, así que cada captura va dentro de
# un lienzo naranja con un título arriba.
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = "marketing/store-screenshots/iphone-out/grande_1290x2796/{:02d}.png"
OUT = "marketing/store-screenshots/play-out/{:02d}.png"
FONT = "node_modules/@expo-google-fonts/outfit/800ExtraBold/Outfit_800ExtraBold.ttf"
TITLES = [
    "Encuentra dónde\ncomer hoy",
    "Todo San Cristóbal\nen el mapa",
    "Menú, precios\ny WhatsApp",
    "Filtra por lo\nque se te antoje",
    "Deja tu rank\ny gana XP",
    "Para dueños:\ntu local, visible",
]
W, H = 1080, 1920
TOP = 330

def gradient():
    a, b = (220, 90, 45), (176, 56, 22)
    g = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(g)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)))
    return g

font = ImageFont.truetype(FONT, 84)
for i, title in enumerate(TITLES, start=1):
    bg = gradient()
    d = ImageDraw.Draw(bg)
    d.multiline_text((W // 2, 170), title, font=font, fill="white", anchor="mm", align="center", spacing=10)
    shot = Image.open(SRC.format(i)).convert("RGB")
    sh = H - TOP + 40           # la parte de abajo se corta un poco: se ve como un teléfono que sale del borde
    sw = int(shot.width * sh / shot.height)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, sh + 60), radius=56, fill=255)
    x = (W - sw) // 2
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x - 4, TOP + 12, x + sw + 4, H + 80), radius=60, fill=(60, 20, 5, 110))
    bg = Image.alpha_composite(bg.convert("RGBA"), shadow.filter(ImageFilter.GaussianBlur(24)))
    bg.paste(shot, (x, TOP), mask)
    bg.convert("RGB").save(OUT.format(i), optimize=True)
    print(OUT.format(i))
