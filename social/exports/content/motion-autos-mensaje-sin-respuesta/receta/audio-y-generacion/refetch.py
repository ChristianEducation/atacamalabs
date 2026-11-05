import re, urllib.request, sys
from PIL import Image
name = sys.argv[1]
t = open('img/' + name + '.png.json', encoding='utf-8').read()
urls = re.findall(r'https?://[^"\s\\]+', t)
full = [u for u in urls if '_min' not in u and u.endswith('.png')]
print(full[:2])
urllib.request.urlretrieve(full[0], 'img/' + name + '.png')
im = Image.open('img/' + name + '.png'); print(im.size)
im.resize((im.width // 3, im.height // 3)).save('img/' + name + '_prev.png')
