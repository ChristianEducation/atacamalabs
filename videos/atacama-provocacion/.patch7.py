p = 'index.html'
s = open(p, encoding='utf8').read()


def rep(a, b):
    global s
    if a not in s:
        print('NO ESTÁ:', a[:80])
        return
    s = s.replace(a, b, 1)


# colores de letra = color del lado opuesto (cada mitad lleva el color de la otra)
rep('.real { background: var(--real); color: #ffffff; --gl: rgba(255, 255, 255, 0.13); }', '.real { background: var(--real); --gl: rgba(255, 255, 255, 0.13); }')
rep('.brand { background: var(--blue); color: #ffffff; --gl: rgba(255, 255, 255, 0.16); }', '.brand { background: var(--blue); --gl: rgba(255, 255, 255, 0.16); }')
rep('.sky { background: var(--sky); color: var(--ink); --gl: rgba(255, 255, 255, 0.34); }', '.sky { background: var(--sky); --gl: rgba(255, 255, 255, 0.34); }')
rep('.mist { background: var(--mist); color: var(--ink); --gl: rgba(15, 92, 237, 0.12); }', '.mist { background: var(--mist); --gl: rgba(15, 92, 237, 0.12); }\n      .c-real { color: var(--real); } .c-brand { color: var(--blue); } .c-sky { color: var(--sky); } .c-mist { color: var(--mist); }')

# golpe 1: azul profundo (arriba, letra cielo) | cielo (abajo, letra azul profundo)
rep('<div id="b1b" class="pan bot brand"', '<div id="b1b" class="pan bot sky"')
rep('<div class="txt" id="t1a"><span class="ln"><i>¿quién</i>', '<div class="txt c-sky" id="t1a"><span class="ln"><i>¿Quién</i>')
rep('<div class="txt" id="t1b">', '<div class="txt c-real" id="t1b">')
# golpe 2: niebla (arriba, letra azul de marca) | azul de marca (abajo, letra niebla)
rep('<div class="txt" id="t2a"><span class="ln"><i>¿quién hace</i>', '<div class="txt c-brand" id="t2a"><span class="ln"><i>¿Quién hace</i>')
rep('<div id="b2b" class="pan bot sky"', '<div id="b2b" class="pan bot brand"')
rep('<div class="txt" id="t2b">', '<div class="txt c-mist" id="t2b">')
# golpe 3: azul profundo (arriba, letra niebla) | niebla (abajo, letra azul profundo)
rep('<div class="txt big" id="t3a"><span class="ln"><i>alguien</i>', '<div class="txt big c-mist" id="t3a"><span class="ln"><i>Alguien</i>')
rep('<div id="b3b" class="pan bot real"', '<div id="b3b" class="pan bot mist"')
rep('<div class="txt big" id="t3b">', '<div class="txt big c-real" id="t3b">')
rep('las dos mitades del mismo azul, la cuadrícula cruza la costura', 'cada mitad lleva el color de la otra')
open(p, 'w', encoding='utf8').write(s)
print('ok')
