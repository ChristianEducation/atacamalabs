import sys, glob, os
from PIL import Image, ImageDraw
d, out, cols, w = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
files = sorted(glob.glob(os.path.join(d, 'f*.png')))
if len(sys.argv) > 5:
    a, b = int(sys.argv[5]), int(sys.argv[6]); files = files[a:b]
h = round(w * 1920 / 1080)
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (30, 30, 30))
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
    dr = ImageDraw.Draw(im); dr.text((8, 6), os.path.basename(f)[1:5] + ' = %.2fs' % (int(os.path.basename(f)[1:5]) / 30), fill=(255, 255, 0))
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out); print(sheet.size)
