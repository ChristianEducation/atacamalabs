p = 'index.html'
s = open(p, encoding='utf8').read()


def rep(a, b):
    global s
    if a not in s:
        print('NO ESTÁ:', a[:90])
        return
    s = s.replace(a, b, 1)


# escena 1 con los colores de la escena 2: niebla (letra azul de marca) arriba | azul de marca (letra niebla) abajo
rep('<div id="b1t" class="pan top real"', '<div id="b1t" class="pan top mist"')
rep('<div class="gd"></div><div class="plogo dk"></div>\n        <div class="txt c-sky" id="t1a">', '<div class="gd"></div><div class="plogo lt"></div>\n        <div class="txt c-brand" id="t1a">')
rep('<div id="b1b" class="pan bot sky"', '<div id="b1b" class="pan bot brand"')
rep('<div class="txt c-real" id="t1b">', '<div class="txt c-mist" id="t1b">')

# como la escena 1 y la 2 ahora comparten colores, un filo de luz marca el borde del barrido para que se siga leyendo hacia arriba
rep('      #seam { z-index: 21;', '      .edge { position: absolute; left: 0; width: 1080px; height: 5px; z-index: 40; opacity: 0; pointer-events: none; }\n      #e2b { top: 1920px; background: #ffffff; }\n      #e2t { top: 960px; background: var(--blue); }\n      #seam { z-index: 21;')
rep('      <div id="seam"></div>', '      <div id="seam"></div>\n      <div id="e2b" class="edge" data-layout-allow-overflow></div>\n      <div id="e2t" class="edge" data-layout-allow-overflow></div>')
rep('      up("#b2b", 1.9); up("#b2t", 1.98);', '''      up("#b2b", 1.9); up("#b2t", 1.98);
      tl.set("#e2b", { opacity: 1 }, 1.9); tl.fromTo("#e2b", { y: 0 }, { y: -960, duration: 0.72, ease: "expo.inOut" }, 1.9); tl.set("#e2b", { opacity: 0 }, 2.62);
      tl.set("#e2t", { opacity: 1 }, 1.98); tl.fromTo("#e2t", { y: 0 }, { y: -960, duration: 0.72, ease: "expo.inOut" }, 1.98); tl.set("#e2t", { opacity: 0 }, 2.7);''')
open(p, 'w', encoding='utf8').write(s)
print('ok')
