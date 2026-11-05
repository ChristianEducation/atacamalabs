"""Genera scripts/aster/aster-assets.mjs: anchos de Helvetica (cp1252) y el logo oficial listo para incrustar en un PDF.
Uso: python -I scripts/aster/gen-assets.py <logo-rgba.png>   (pymupdf)
El logo proviene de la plantilla ASTER (06-PLANTILLA-INFORME-EJEMPLO.pdf, recurso oficial aportado por Atacama Labs)."""
import sys, zlib, base64, json, pymupdf

logo_path = sys.argv[1]
pm = pymupdf.Pixmap(logo_path)
pm.shrink(2)  # 5642x530 -> 1411x133
w, h = pm.width, pm.height
assert pm.n == 4 and pm.alpha
raw = pm.samples
rgb = bytearray(); alpha = bytearray()
for i in range(0, len(raw), 4):
    rgb += raw[i:i+3]; alpha.append(raw[i+3])
b64 = lambda b: base64.b64encode(zlib.compress(bytes(b), 9)).decode()
widths = {}
for key, name in (("reg", "helv"), ("bold", "hebo"), ("ital", "heit")):
    f = pymupdf.Font(name)
    arr = []
    for code in range(32, 256):
        try:
            ch = bytes([code]).decode("cp1252")
        except UnicodeDecodeError:
            arr.append(0); continue
        arr.append(round(f.text_length(ch, fontsize=1000)))
    widths[key] = arr
out = "// GENERADO por scripts/aster/gen-assets.py — no editar a mano.\n"
out += "export const FONT_W = " + json.dumps(widths) + ";\n"
out += "export const LOGO = " + json.dumps({"w": w, "h": h, "rgb": b64(rgb), "alpha": b64(alpha)}) + ";\n"
open("scripts/aster/aster-assets.mjs", "w", encoding="utf-8").write(out)
print("logo", w, h, "rgb", len(b64(rgb)), "alpha", len(b64(alpha)), "bytes b64; fonts ok", {k: v[1:6] for k, v in widths.items()})
