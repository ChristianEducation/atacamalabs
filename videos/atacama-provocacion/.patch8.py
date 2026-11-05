p = 'index.html'
s = open(p, encoding='utf8').read()


def rep(a, b):
    global s
    if a not in s:
        print('NO ESTÁ:', a[:90])
        return
    s = s.replace(a, b, 1)


# ayudantes: entrada lateral de paneles y de texto
rep('      // cada línea sube desde una máscara;', '''      // entrada lateral de un panel (crece desde el borde izquierdo o derecho) y deslizamiento lateral de sus líneas
      const sideIn = (sel, t, from, dur = 0.72, ease = "expo.inOut") =>
        tl.fromTo(sel, { clipPath: from === "left" ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)" }, { clipPath: SHOW, duration: dur, ease }, t);
      const slide = (id, t, xp, st = 0.1) =>
        tl.fromTo(id + " .ln i", { xPercent: xp }, { xPercent: 0, duration: 0.85, ease: "expo.out", stagger: st }, t);
      // cada línea sube desde una máscara;''')

# 1 · apertura LATERAL: arriba entra desde la izquierda, abajo desde la derecha
rep('''      tl.fromTo("#b1t", { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: SHOW, duration: 0.7, ease: "expo.out" }, 0);
      tl.fromTo("#b1b", { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: SHOW, duration: 0.7, ease: "expo.out" }, 0);''',
    '''      sideIn("#b1t", 0, "left", 0.75, "expo.out");
      sideIn("#b1b", 0.06, "right", 0.75, "expo.out");''')
rep('lines("#t1a", 0.32); lines("#t1b", 0.5);', 'slide("#t1a", 0.32, -108); slide("#t1b", 0.5, 108);')
rep('// 1 · los paneles se abren desde la costura', '// 1 · LATERAL: el panel de arriba entra desde la izquierda y el de abajo desde la derecha')

# 2 · hacia ARRIBA (igual que antes)
rep('// 2 · barrido hacia arriba:', '// 2 · ARRIBA: barrido hacia arriba:')

# 3 · LATERAL en sentido contrario al de la apertura: abajo desde la izquierda, arriba desde la derecha
rep('up("#b3b", 4.45); up("#b3t", 4.53);', 'sideIn("#b3b", 4.45, "left"); sideIn("#b3t", 4.53, "right");')
rep('lines("#t3a", 4.9, 0.12); lines("#t3b", 5.08, 0.14);', 'slide("#t3a", 4.9, 108, 0.12); slide("#t3b", 5.08, -108, 0.14);')
rep('// 3 · «alguien | tiene que hacerlo»: cada mitad lleva el color de la otra', '// 3 · LATERAL, al revés que la apertura: «alguien | tiene que hacerlo», cada mitad lleva el color de la otra')
open(p, 'w', encoding='utf8').write(s)
print('ok')
