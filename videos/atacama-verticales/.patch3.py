import re
p = 'index.html'
s = open(p, encoding='utf8').read()


def rep(a, b):
    global s
    if a not in s:
        print('NO ESTÁ:', a[:90])
        return
    s = s.replace(a, b, 1)


# 1 · fuera la lista de rubros bajo el logo
rep('        <div id="rub">SALUD · INMOBILIARIAS · MINERÍA<br />GIMNASIOS · EDUCACIÓN · CASINOS</div>\n', '')
s = re.sub(r'      #rub \{[^}]*\}\n', '', s)
s = re.sub(r'      tl\.fromTo\("#rub".*?\n', '', s)
rep('top: 1110px; bottom: auto; left: 96px', 'top: 1085px; bottom: auto; left: 96px')
rep('top: 1110px; bottom: auto; right: 96px', 'top: 1085px; bottom: auto; right: 96px')

# 2 · la hoja de contacto se revela como una ráfaga que acelera (cada mini = un disparo con su flash)
rep('      tl.fromTo(".mini", { scale: 0.55, opacity: 0, y: 36 }, { scale: 1, opacity: 1, y: 0, duration: 0.38, ease: "back.out(1.5)", stagger: 0.075 }, 4.08);',
    '''      // ráfaga que acelera: 0,14 · 0,12 · 0,10 · 0,09 · 0,08 s entre disparos
      const MT = [4.08, 4.22, 4.34, 4.44, 4.53, 4.61];
      MT.forEach((t, i) => {
        tl.fromTo("#m" + i, { scale: 0.55, opacity: 0, y: 36 }, { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: "back.out(1.5)" }, t);
        flash(t, 0.3, 0.09);
      });''')
open(p, 'w', encoding='utf8').write(s)

a = 'audio/build_audio.py'
t = open(a, encoding='utf8').read()
old = '''for i in range(6):
    add(bp(rng.standard_normal(int(0.04 * SR)), 1500, 7000) * env(int(0.04 * SR), 0.006) * 1.3, 4.08 + 0.075 * i, 0.4, pan=-0.4 + 0.16 * i)'''
new = '''# ráfaga que acelera al revelar los rubros (mismos tiempos que las fotos de la hoja)
for i, tt in enumerate([4.08, 4.22, 4.34, 4.44, 4.53, 4.61]):
    add(shutter(0.9), tt, 1.0, pan=-0.45 + 0.18 * i)'''
if old not in t:
    print('NO ESTÁ el bloque de audio')
else:
    t = t.replace(old, new, 1)
    open(a, 'w', encoding='utf8').write(t)
print('ok')
