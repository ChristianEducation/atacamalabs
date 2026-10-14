#!/usr/bin/env python3
"""Atacama OS v3 · Fase 3 — recorte de fondo liso (técnica de social/exports/content/carrusel-flows-v3/receta/recorte-fondo.py) SIN numpy.

Los prompts piden «fondo liso»: se toma el color del borde, se inunda desde los bordes con tolerancia (ImageDraw.floodfill, en C) y lo inundado
queda transparente, con el borde suavizado. No depende del removedor de Higgsfield (se colgó) ni de rembg (pesado). Solo Pillow.

Uso: python3 cutout.py <entrada.png> <salida.png> [tolerancia=24]
Imprime: color de fondo detectado y % transparente. Sale con código 3 si casi nada quedó transparente (el fondo no era liso).
"""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

MARK = (255, 0, 254)


def edge_color(im):
    w, h = im.size
    px = im.load()
    pts = [px[x, y] for x in range(0, w, max(1, w // 64)) for y in (0, 1, h - 2, h - 1)] + [px[x, y] for y in range(0, h, max(1, h // 64)) for x in (0, 1, w - 2, w - 1)]
    return tuple(sorted(p[c] for p in pts)[len(pts) // 2] for c in range(3))


def cutout(src, dst, tol=24):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    bg = edge_color(im)
    work = im.copy()
    px = work.load()
    seeds = [(x, y) for x in range(0, w, max(1, w // 40)) for y in (0, h - 1)] + [(x, y) for y in range(0, h, max(1, h // 40)) for x in (0, w - 1)]
    for (x, y) in seeds:
        p = px[x, y]
        if p == MARK:
            continue
        if max(abs(p[c] - bg[c]) for c in range(3)) <= tol:
            ImageDraw.floodfill(work, (x, y), MARK, thresh=tol)
    diff = ImageChops.difference(work, Image.new('RGB', (w, h), MARK)).convert('L')
    alpha = diff.point(lambda v: 0 if v == 0 else 255)
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.3))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    out.save(dst)
    hist = alpha.histogram()
    transparent = sum(hist[:8]) / float(w * h)
    print('bg', bg, 'transparente %', round(transparent * 100, 1))
    return transparent


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    t = cutout(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 24)
    sys.exit(3 if t < 0.05 else 0)
