p = 'index.html'
s = open(p, encoding='utf8').read()


def rep(a, b):
    global s
    if a not in s:
        print('NO ESTÁ:', a[:90])
        return
    s = s.replace(a, b, 1)


# golpe de cámara por «zoom de impacto» (no deja ver bordes), en vez de sacudida lateral
rep('tl.fromTo("#shots", { x: i % 2 ? 14 : -14, y: i % 2 ? -8 : 8 }, { x: 0, y: 0, duration: 0.2, ease: "expo.out", immediateRender: false }, t);',
    'tl.fromTo("#shots", { scale: 1.05 }, { scale: 1, duration: 0.22, ease: "expo.out", transformOrigin: "50% 50%", immediateRender: false }, t);\n        if (i > 0) tl.set("#s" + (i - 1), { autoAlpha: 0 }, t + 0.06);   // la foto anterior ya quedó tapada')
rep('      // 1 · ráfaga de 6 fotos', '      tl.set("#intro", { autoAlpha: 0 }, 1.26);\n      // 1 · ráfaga de 6 fotos')
rep('      tl.set("#sheet", { autoAlpha: 1 }, 3.95);', '      tl.set("#sheet", { autoAlpha: 1 }, 3.95);\n      tl.set("#shots", { autoAlpha: 0 }, 4.02);')
rep('      tl.set("#end", { autoAlpha: 1 }, 5.75);', '      tl.set("#end", { autoAlpha: 1 }, 5.75);\n      tl.set("#sheet", { autoAlpha: 0 }, 5.82);')
open(p, 'w', encoding='utf8').write(s)
print('ok')
