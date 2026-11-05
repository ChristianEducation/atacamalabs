import re, json
# Reparto de 16 s: contenido hasta e0 = 13,4 s y cierre de 2,6 s.
E0_TARGET = 13.4
plateaus = [(2.12, 0.6), (3.30, 0.6), (4.13, 0.5), (4.90, 0.6), (6.40, 0.7), (7.95, 0.7)]  # (instante "viejo", segundos de pausa)
k = (E0_TARGET - 0.1 - sum(d for _, d in plateaus)) / (8.25 - 0.1)
OLD = [0.0, 0.1]; NEW = [0.0, 0.1]
o, n = 0.1, 0.1
for t, d in plateaus:
    n += (t - o) * k; o = t; OLD.append(round(o, 4)); NEW.append(round(n, 4))
    o += 0.01; n += d; OLD.append(round(o, 4)); NEW.append(round(n, 4))
n += (8.25 - o) * k; o = 8.25; OLD.append(o); NEW.append(round(n, 4))
E0 = NEW[-1]; DUR = round(E0 + 2.6, 1)
print('k', round(k, 3), 'e0', E0, 'DUR', DUR); print(OLD); print(NEW)

s = open('page.template.html', encoding='utf-8').read()
s = re.sub(r"const OLDK = \[[^\]]*\], NEWK = \[[^\]]*\];", "const OLDK = %s, NEWK = %s;" % (json.dumps(OLD), json.dumps(NEW)), s)
rep = [
    ("const lu = eout(seg(T0, e0 + 0.1, e0 + 0.65));", "const lu = eout(seg(T0, e0 + 0.05, e0 + 0.55));"),
    ("const cu = eout(seg(T0, e0 + 0.4, e0 + 0.95));", "const cu = eout(seg(T0, e0 + 0.3, e0 + 0.8));"),
    ("eout(seg(T0, e0 + 1.0, e0 + 1.5))", "eout(seg(T0, e0 + 0.75, e0 + 1.2))"),
    ("eout(seg(T0, e0 + 1.2, e0 + 1.7))", "eout(seg(T0, e0 + 0.9, e0 + 1.4))"),
]
for a, b in rep:
    assert a in s, a
    s = s.replace(a, b)
open('page.template.html', 'w', encoding='utf-8').write(s)

r = open('render.mjs', encoding='utf-8').read()
r = re.sub(r"DUR = [0-9.]+,", "DUR = %s," % DUR, r, count=1)
r = re.sub(r"e0: [0-9.]+,", "e0: %s," % E0, r)
open('render.mjs', 'w', encoding='utf-8').write(r)

a = open('audio_ads3.py', encoding='utf-8').read()
a = re.sub(r"OLDK = \[[^\]]*\]; NEWK = \[[^\]]*\]", "OLDK = %s; NEWK = %s" % (json.dumps(OLD), json.dumps(NEW)), a)
a = re.sub(r"DUR = [0-9.]+", "DUR = %s" % DUR, a, count=1)
rep = [
    ("put(h1, e + 0.1, db(-11), 0); put(thud(80, .25, .05), e + 0.1, db(-17), 0)", "put(h1, e + 0.05, db(-11), 0); put(thud(80, .25, .05), e + 0.05, db(-17), 0)"),
    ("put(h2, e + 0.45, db(-8), 0); put(thud(90, .3, .06), e + 0.45, db(-15), 0)", "put(h2, e + 0.3, db(-8), 0); put(thud(90, .3, .06), e + 0.3, db(-15), 0)"),
    ("put(bell(880, 2.2, .7), e + 0.45, db(-28), 0)", "put(bell(880, 2.2, .7), e + 0.3, db(-28), 0)"),
    ("click(.03, 1500, 1200), TM['s6'] + 1.0, db(-26), 0); put(pop(600, 850), TM['s6'] + 1.2, db(-26), 0)", "click(.03, 1500, 1200), TM['s6'] + 0.75, db(-26), 0); put(pop(600, 850), TM['s6'] + 0.9, db(-26), 0)"),
    ("(TM['s6'], 11.35,", "(TM['s6'], 10.85,"),
]
for x, y in rep:
    assert x in a, x[:50]
    a = a.replace(x, y)
open('audio_ads4.py', 'w', encoding='utf-8').write(a)
print('ok')
