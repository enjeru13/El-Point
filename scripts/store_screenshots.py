"""
Prepara las capturas de pantalla para App Store Connect.

Uso (desde la carpeta del proyecto):

    python scripts/store_screenshots.py iphone  <carpeta_con_capturas>  <carpeta_de_salida>
    python scripts/store_screenshots.py ipad    <carpeta_con_capturas>  <carpeta_de_salida>

iphone: toma capturas de un iPhone 14 Pro Max (1290 x 2796) y deja dos copias:
          <salida>/mediana_1179x2556/   -> recuadro OBLIGATORIO ("pantalla mediana")
          <salida>/grande_1290x2796/    -> recuadro OPCIONAL ("pantalla grande")
        Las dos pantallas tienen la misma proporción, así que no se deforma nada.

ipad:   toma capturas de un iPad Air 11" (1640 x 2360) y las deja en 2064 x 2752
        (iPad 13"). Como la proporción es distinta, la captura se ajusta a la
        altura y se completa a los lados con el color de fondo de la propia
        captura, sin recortar ni deformar.

Requiere Pillow (pip install pillow). Salida en PNG sin transparencia.
"""

import sys
from pathlib import Path

from PIL import Image

EXT = {".png", ".jpg", ".jpeg", ".heic"}

IPHONE_MEDIUM = (1179, 2556)
IPHONE_LARGE = (1290, 2796)
IPAD_13 = (2064, 2752)


def flat(img: Image.Image) -> Image.Image:
    """Quita la transparencia: Apple no la acepta."""
    if img.mode in ("RGBA", "LA", "P"):
        base = Image.new("RGB", img.size, (255, 255, 255))
        base.paste(img.convert("RGBA"), mask=img.convert("RGBA").split()[-1])
        return base
    return img.convert("RGB")


def files(folder: Path):
    return sorted(p for p in folder.iterdir() if p.suffix.lower() in EXT)


def iphone(src: Path, out: Path) -> None:
    mid = out / "mediana_1179x2556"
    big = out / "grande_1290x2796"
    mid.mkdir(parents=True, exist_ok=True)
    big.mkdir(parents=True, exist_ok=True)
    for i, p in enumerate(files(src), 1):
        img = flat(Image.open(p))
        if img.size != IPHONE_LARGE:
            print(f"AVISO {p.name}: mide {img.size}, se esperaba {IPHONE_LARGE}; se ajusta igual.")
        large = img.resize(IPHONE_LARGE, Image.LANCZOS) if img.size != IPHONE_LARGE else img
        medium = img.resize(IPHONE_MEDIUM, Image.LANCZOS)
        name = f"{i:02d}.png"
        large.save(big / name, optimize=True)
        medium.save(mid / name, optimize=True)
        print(f"{p.name} -> {name}")
    print(f"Listo. Sube '{mid.name}' al recuadro obligatorio y '{big.name}' al opcional.")


def ipad(src: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    w, h = IPAD_13
    for i, p in enumerate(files(src), 1):
        img = flat(Image.open(p))
        scale = h / img.height
        new_w = round(img.width * scale)
        if new_w > w:
            scale = w / img.width
            new_w, new_h = w, round(img.height * scale)
        else:
            new_h = h
        resized = img.resize((new_w, new_h), Image.LANCZOS)
        # Color de fondo: el de la esquina superior izquierda de la propia captura.
        bg = img.getpixel((2, 2))
        canvas = Image.new("RGB", (w, h), bg)
        canvas.paste(resized, ((w - new_w) // 2, (h - new_h) // 2))
        name = f"{i:02d}.png"
        canvas.save(out / name, optimize=True)
        print(f"{p.name} -> {name}  ({w}x{h})")
    print(f"Listo. Sube lo de '{out}' al recuadro de iPad 13\".")


def main() -> None:
    if len(sys.argv) != 4 or sys.argv[1] not in ("iphone", "ipad"):
        print(__doc__)
        sys.exit(1)
    mode, src, out = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
    if not src.is_dir():
        print(f"No existe la carpeta: {src}")
        sys.exit(1)
    (iphone if mode == "iphone" else ipad)(src, out)


if __name__ == "__main__":
    main()
