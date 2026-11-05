import re, json
# ---- mapa de tiempos: tramo base (igual que v2) + una pausa de 1 s en cada dato ----
base = [(0.1, 2.2, 1.38), (2.2, 3.55, 1.26), (3.55, 5.15, 1.625), (5.15, 6.75, 1.625), (6.75, 8.25, 1.733)]
slope = lambda t: next(sl for a, b, sl in base if a <= t < b) if t < 8.25 else 1
plateaus = [2.12, 3.30, 4.13, 4.90, 6.40, 7.95]   # momento (tiempo "viejo") donde cada dato ya se ve completo
OLD = [0.0, 0.1]; NEW = [0.0, 0.1]
cur_o, cur_n = 0.1, 0.1
def advance(to):
    global cur_o, cur_n
    # avanzar por tramos respetando cambios de pendiente
    while cur_o < to - 1e-9:
        nxt = min([b for a, b, sl in base if b > cur_o + 1e-9] + [to]) if cur_o < 8.25 else to
        nxt = min(nxt, to)
        cur_n += (nxt - cur_o) * slope(cur_o + 1e-6); cur_o = nxt
        OLD.append(round(cur_o, 4)); NEW.append(round(cur_n, 4))
for p in plateaus:
    advance(p)
    cur_o += 0.01; cur_n += 1.0       # pausa: casi congelado durante 1 s
    OLD.append(round(cur_o, 4)); NEW.append(round(cur_n, 4))
advance(8.25)
# quitar duplicados exactos
pairs = []
for o, n in zip(OLD, NEW):
    if not pairs or o > pairs[-1][0] + 1e-9: pairs.append((o, n))
OLD = [p[0] for p in pairs]; NEW = [p[1] for p in pairs]
E0 = NEW[-1]; DUR = round(E0 + 3.1, 1)
print('OLD', OLD); print('NEW', NEW); print('e0', E0, 'DUR', DUR)

# ---- plantilla ----
s = open('page.template.html', encoding='utf-8').read()
s = re.sub(r"const OLDK = \[[^\]]*\], NEWK = \[[^\]]*\];", "const OLDK = %s, NEWK = %s;" % (json.dumps(OLD), json.dumps(NEW)), s)
a = "$('c1').style.opacity = seg(T, TM.s3 + 0.55, TM.s3 + 0.8);"
assert a in s; s = s.replace(a, "$('c1').style.opacity = seg(T, TM.s3 + 0.3, TM.s3 + 0.5);")
a = "mid.style.opacity = T >= TM.s3 + 0.5 ? 1 : 0;"
assert a in s; s = s.replace(a, "mid.style.opacity = T >= TM.s3 + 0.3 ? 1 : 0;")
open('page.template.html', 'w', encoding='utf-8').write(s)

# ---- render ----
r = open('render.mjs', encoding='utf-8').read()
r = re.sub(r"DUR = [0-9.]+,", "DUR = %s," % DUR, r, count=1)
r = r.replace("lose1: 2.1,", "lose1: 2.0,").replace("e0: 12.5,", "e0: %s," % E0)
open('render.mjs', 'w', encoding='utf-8').write(r)

# ---- audio ----
a = open('audio_ads2.py', encoding='utf-8').read()
a = re.sub(r"OLDK = \[[^\]]*\]; NEWK = \[[^\]]*\]", "OLDK = %s; NEWK = %s" % (json.dumps(OLD), json.dumps(NEW)), a)
a = a.replace('DUR = 15.6', 'DUR = %s' % DUR)
i = a.index("put(bell(880, 2.4, .9), TM['s6'] + 0.1")
j = a.index('\n', i)
bass = '''
def bass(f, d, dec):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) + 0.3 * np.sin(6 * np.pi * f * t) + 0.12 * np.sin(8 * np.pi * f * t)) * np.minimum(1, t / 0.012) * np.exp(-t / dec)
def reverb(x, tail=2.2):
    ir = rng.standard_normal(int(tail * SR)) * np.exp(-tt(tail) / 0.55); ir = lp(ir, 2200); ir /= np.sqrt((ir ** 2).sum())
    n = len(x) + len(ir); F = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[:n]
e = TM['s6']
put(swoosh(1.0, True, 3500, 300), e - 0.7, db(-27), 0)
h1 = bass(49, 1.4, .35); put(h1, e + 0.1, db(-11), 0); put(thud(80, .25, .05), e + 0.1, db(-17), 0)
h2 = bass(65.4, 2.8, .9); h2 = h2 + 0.9 * reverb(h2, 2.2)[:len(h2)]; h2 /= np.abs(h2).max()
put(h2, e + 0.45, db(-8), 0); put(thud(90, .3, .06), e + 0.45, db(-15), 0)
put(bell(880, 2.2, .7), e + 0.45, db(-28), 0)
'''
a = a[:i] + bass + a[j:]
a = a.replace("click(.03, 1500, 1200), TM['s6'] + 1.0, db(-24), 0); put(pop(600, 850), TM['s6'] + 1.2, db(-24), 0)", "click(.03, 1500, 1200), TM['s6'] + 1.0, db(-26), 0); put(pop(600, 850), TM['s6'] + 1.2, db(-26), 0)")
open('audio_ads3.py', 'w', encoding='utf-8').write(a)
print('ok')
