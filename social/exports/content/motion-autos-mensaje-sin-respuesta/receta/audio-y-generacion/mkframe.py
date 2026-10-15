import numpy as np, json
from PIL import Image, ImageFilter
cut = Image.open('img/phone1_cut.png').convert('RGBA')
a = np.asarray(cut).astype(np.int16)
r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
green = (g > 170) & (r < 120) & (b < 120) & (al > 0)
# nos quedamos con la mayor región verde conectada: aprox. por el bbox de los píxeles verdes
ys, xs = np.where(green)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
print('hueco bbox', x0, y0, x1, y1, 'ancho', x1 - x0 + 1, 'alto', y1 - y0 + 1)
hole = Image.fromarray((green * 255).astype(np.uint8))
hole_er = hole.filter(ImageFilter.MinFilter(5))            # el marco cubre 2 px del borde
he = np.asarray(hole_er) > 0
out = a.copy().astype(np.uint8)
# despill del verde en los bordes del hueco
near = np.asarray(hole.filter(ImageFilter.MaxFilter(15))) > 0
dom = (g > np.maximum(r, b) + 12) & near & ~he
out[..., 1] = np.where(dom, np.minimum(g, np.maximum(r, b) + 4), out[..., 1])
out[..., 3] = np.where(he, 0, out[..., 3])
fr = Image.fromarray(out, 'RGBA')
bb = fr.getbbox(); print('bbox marco', bb)
# recorte al marco
fr_c = fr.crop(bb)
fr_c.save('img/frame.png')
# brillo de vidrio dentro del hueco (diagonal suave)
H, W = he.shape
yy, xx = np.mgrid[0:H, 0:W]
t = (xx / W * 0.8 + yy / H * 0.2)
alpha = np.clip(0.20 - 0.50 * np.abs(t - 0.30), 0, 0.16)
gl = np.zeros((H, W, 4), np.uint8); gl[..., :3] = 255; gl[..., 3] = (alpha * 255 * (np.asarray(hole) > 0)).astype(np.uint8)
Image.fromarray(gl, 'RGBA').crop(bb).save('img/glare.png')
geo = {'frame_w': fr_c.width, 'frame_h': fr_c.height, 'hole': [int(x0 - bb[0]), int(y0 - bb[1]), int(x1 - x0 + 1), int(y1 - y0 + 1)]}
json.dump(geo, open('img/frame_geo.json', 'w')); print(geo)
