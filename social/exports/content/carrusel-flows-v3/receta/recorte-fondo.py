import sys, numpy as np
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.int16); h, w, _ = a.shape
edge = np.concatenate([a[:12].reshape(-1, 3), a[:, :12].reshape(-1, 3)])
bg = np.median(edge, axis=0)
d = np.abs(a - bg).max(axis=2)
cand = (d <= int(sys.argv[5]) if len(sys.argv) > 5 else d <= 9)
if len(sys.argv) > 3:
    r0 = int(float(sys.argv[3]) * h)
    cand[r0:] = d[r0:] <= int(sys.argv[4])
seen = np.zeros((h, w), dtype=bool)
stack = []
for x in range(w):
    for y in (0, h - 1):
        if cand[y, x] and not seen[y, x]: seen[y, x] = True; stack.append((y, x))
for y in range(h):
    for x in (0, w - 1):
        if cand[y, x] and not seen[y, x]: seen[y, x] = True; stack.append((y, x))
while stack:
    y, x = stack.pop()
    for ny, nx in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
        if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not seen[ny, nx]:
            seen[ny, nx] = True; stack.append((ny, nx))
alpha = np.where(seen, 0, 255).astype(np.uint8)
al = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.3))
out = im.convert('RGBA'); out.putalpha(al); out.save(dst)
print('bg', bg, 'transparent %', round(float(seen.mean()) * 100, 1))
